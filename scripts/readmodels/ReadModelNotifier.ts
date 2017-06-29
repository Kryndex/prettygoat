import {Event} from "../events/Event";
import {Observable, Subject} from "rx";

export interface IReadModelNotifier {
    changes(name: string): Observable<Event>;
    notifyChanged(name: string, timestamp: Date);
}

export class ReadModelNotifier implements IReadModelNotifier {

    private subject = new Subject<Event>();

    changes(name: string): Observable<Event> {
        return this.subject.filter(event => event.payload === name);
    }

    notifyChanged(name: string, timestamp: Date) {
        this.subject.onNext({
            type: "ReadModelChanged",
            payload: name,
            timestamp: timestamp
        });
    }
}
