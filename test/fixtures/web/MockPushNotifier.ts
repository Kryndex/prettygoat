import {IPushNotifier} from "../../../scripts/web/IPushComponents";
import PushContext from "../../../scripts/web/PushContext";

class MockPushNotifier implements IPushNotifier {

    notify(context:PushContext, clientId?:string, splitKey?:string):void {
    }

}

export default MockPushNotifier