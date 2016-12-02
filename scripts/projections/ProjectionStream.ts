import {Event} from "../streams/Event";
import {Observable, Subject, Disposable, helpers, HistoricalScheduler, CompositeDisposable} from "rx";
import ReservedEvents from "../streams/ReservedEvents";
import Tick from "../ticks/Tick";
import IDateRetriever from "../util/IDateRetriever";
import * as _ from "lodash";

export function combineStreams(combined:Subject<Event>, events:Observable<Event>, readModels:Observable<Event>, ticks:Observable<Event>, dateRetriever:IDateRetriever) {
    let realtime = false;
    let scheduler = new HistoricalScheduler(0, helpers.defaultSubComparer);

    events
        .merge(readModels)
        .filter(event => !_.startsWith(event.type, "__diagnostic"))
        .subscribe(event => {
            if (event.type === ReservedEvents.REALTIME) {
                if (!realtime)
                    scheduler.advanceTo(8640000000000000); //Flush events buffer since there are no more events
                realtime = true;
                return;
            }
            if (realtime || !event.timestamp) {
                combined.onNext(event);
            } else {
                scheduler.scheduleFuture(null, event.timestamp, (scheduler, state) => {
                    combined.onNext(event);
                    return Disposable.empty;
                });
                scheduler.advanceTo(+event.timestamp);
            }
        });

    ticks.subscribe(event => {
        let payload: Tick = event.payload;
        if (realtime || payload.clock > dateRetriever.getDate()) {
            Observable.empty().delay(event.timestamp).subscribeOnCompleted(() => combined.onNext(event));
        } else {
            scheduler.scheduleFuture(null, payload.clock, (scheduler, state) => {
                combined.onNext(event);
                return Disposable.empty;
            });
        }
    });
}

export function mergeSort(observables: Observable<Event>[]): Observable<Event> {
    return Observable.create<Event>(observer => {
        let buffers: Event[][] = _.map(observables, o => []);
        let completed:boolean[] = _.map(observables, o => false);
        let disposable = new CompositeDisposable();

        _.forEach(observables, (observable, i) => {
            disposable.add(observable.subscribe(event => {
                buffers[i].push(event);
                while (observablesHaveEmitted(buffers, completed)) {
                    let item = getLowestItem(buffers);
                    if (item) observer.onNext(item);
                }
            }, error => {
                observer.onError(error);
            }, () => {
                completed[i] = true;
                if (_.every(completed, completion => completion)) {
                    let item = null;
                    do {
                        item = getLowestItem(buffers);
                        if (item) observer.onNext(item);
                    } while (item)
                    observer.onCompleted();
                }
            }));
        });

        return disposable;
    });
}

function observablesHaveEmitted(buffers:Event[][], completed:boolean[]): boolean {
    return _.every(buffers, (buffer, i) => completed[i] || buffer.length);
}

function getLowestItem(buffers: Event[][]): Event {
    let lowestItems = peekLowestItems(buffers);
    if (!lowestItems.length) {
        return null;
    }
    let min = _.minBy(lowestItems, item => !item.event.timestamp ? 0:item.event.timestamp);
    return buffers[min.index].shift();
}

function peekLowestItems(buffers: Event[][]) {
    return _(buffers).map((buffer, i) => {
        return buffer[0] ? {event: buffer[0], index: i} : null;
    }).compact().valueOf();
}