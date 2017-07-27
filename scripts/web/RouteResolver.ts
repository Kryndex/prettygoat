import {IRouteResolver, IRequestHandler, IRouteContext, IRequest} from "./IRequestComponents";
import {multiInject, injectable, optional} from "inversify";
import * as _ from "lodash";
import Methods from "./Methods";
import * as UrlPattern from "url-pattern";
import * as url from "url";

@injectable()
class RouteResolver implements IRouteResolver {

    private routes: Route[];

    constructor(@multiInject("IRequestHandler") @optional() requestHandlers: IRequestHandler[] = []) {
        this.routes = this.mapRoutes(requestHandlers);
    }

    private mapRoutes(requestHandlers: IRequestHandler[]): Route[] {
        return _.map<IRequestHandler, Route>(requestHandlers, requestHandler => {
            let route: Route = {
                method: Reflect.getMetadata("prettygoat:method", requestHandler.constructor),
                handler: requestHandler,
                path: Reflect.getMetadata("prettygoat:path", requestHandler.constructor)
            };
            if (route.method)
                route.matcher = new UrlPattern(route.path);

            return route;
        });
    }

    resolve(request: IRequest): IRouteContext {
        let pathname = url.parse(request.url).pathname,
            completeUrl = url.parse(request.url).href;
        let context = <IRouteContext>_(this.routes)
            .filter(route =>  route.method === request.method || !route.method)
            .map(route => [route.handler, route.matcher ? route.matcher.match(pathname) : route.path === completeUrl])
            .filter(route => route[1])
            .takeRight(1)
            .flatten()
            .valueOf();

        return !context[0] ? [null, null] : context;
    }

}

interface Route {
    handler: IRequestHandler;
    method: Methods;
    path: string;
    matcher?: UrlPattern;
}

export default RouteResolver
