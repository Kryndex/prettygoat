import PushContext from "./PushContext";
import ContextOperations from "./ContextOperations";
import {injectable, inject} from "inversify";
import {IClientRegistry, ISocketClient} from "./IPushComponents";
import {IProjectionRegistry} from "../bootstrap/ProjectionRegistry";

@injectable()
class ClientRegistry implements IClientRegistry {

    constructor(@inject("IProjectionRegistry") private registry: IProjectionRegistry) {
    }

    add(client: ISocketClient, context: PushContext) {
        let entry = this.registry.projectionFor(context.projectionName, context.area),
            partition = entry[1].publish[context.projectionName].notify.$partition;
        if (!partition) {
            client.join(ContextOperations.getRoom(context));
        } else {
            client.join(ContextOperations.getRoom(context, <string>partition(context.parameters)));
        }
    }

    remove(client: ISocketClient, context: PushContext) {
        let entry = this.registry.projectionFor(context.projectionName, context.area),
            partition = entry[1].publish[context.projectionName].notify.$partition;
        if (!partition) {
            client.leave(ContextOperations.getRoom(context));
        } else {
            client.leave(ContextOperations.getRoom(context, <string>partition(context.parameters)));
        }
    }
}

export default ClientRegistry
