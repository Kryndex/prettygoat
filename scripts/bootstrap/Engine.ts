import "bluebird";
import "reflect-metadata";
import {Container} from "inversify";
import IModule from "./IModule";
import IProjectionRegistry from "../registry/IProjectionRegistry";
import * as _ from "lodash";
import PrettyGoatModule from "./PrettyGoatModule";
import IProjectionEngine from "../projections/IProjectionEngine";
import IClientRegistry from "../web/IClientRegistry";
import IPushNotifier from "../web/IPushNotifier";
import IEndpointConfig from "../configs/IEndpointConfig";
import SocketFactory from "../web/SocketFactory";
import ILogger from "../log/ILogger";
import {FeatureChecker} from "bivio";
import {IFeatureChecker} from "bivio";
import {createServer,setIstanceServer} from "./InversifyExpressApp";
import ISocketConfig from "../configs/ISocketConfig";
import APIModule from "../api/APIModule";
import ClusterModule from "../cluster/ClusterModule";

class Engine {

    private container = new Container();
    private modules:IModule[] = [];
    private featureChecker = new FeatureChecker();

    constructor() {
        this.register(new PrettyGoatModule());
        this.register(new ClusterModule());
        this.register(new APIModule());
        this.container.bind<IFeatureChecker>("IFeatureChecker").toConstantValue(this.featureChecker);
    }

    register(module:IModule):boolean {
        if (!this.featureChecker.canCheck(module.constructor) || this.featureChecker.check(module.constructor)) {
            if (module.modules)
                module.modules(this.container);
            this.modules.push(module);
            return true;
        }
        return false;
    }

    run(overrides?:any) {
        let registry = this.container.get<IProjectionRegistry>("IProjectionRegistry"),
            projectionEngine = this.container.get<IProjectionEngine>("IProjectionEngine"),
            clientRegistry = this.container.get<IClientRegistry>("IClientRegistry"),
            pushNotifier = this.container.get<IPushNotifier>("IPushNotifier"),
            config = this.container.get<IEndpointConfig>("IEndpointConfig"),
            socketFactory = this.container.get<SocketFactory>("SocketFactory"),
            logger = this.container.get<ILogger>("ILogger"),
            socketConfig = this.container.get<ISocketConfig>("ISocketConfig");

        _.forEach(this.modules, (module:IModule) => module.register(registry, this.container, overrides));

        setIstanceServer(createServer(this.container).listen(config.port || 80));

        logger.info(`Server listening on ${config.port || 80}`);

        socketFactory.socketForPath(socketConfig.path).on('connection', client => {
            client.on('subscribe', context => {
                clientRegistry.add(client.id, context);
                pushNotifier.notify(context, client.id);
                logger.info(`New client subscribed on ${context} with id ${client.id}`);
            });
            client.on('unsubscribe', message => {
                clientRegistry.remove(client.id, message);
                logger.info(`New client unsubscribed from ${message} with id ${client.id}`);
            });
        });

        projectionEngine.run();
    }
}

export default Engine;
