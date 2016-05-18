import { IObservable, Subject, IDisposable } from "rx";
import { ISnapshotRepository, Snapshot } from "./interfaces/ISnapshotRepository";
import { SpecialNames } from "./SpecialNames";
import { IMatcher } from "./interfaces/IMatcher";
import { IStreamFactory } from "./interfaces/IStreamFactory";

export class ProjectionRunner<T> implements IObservable<T>, IDisposable {
    public state: T;
    private subject: Subject<T>;
    private subscription: IDisposable;
    private isDisposed: boolean;

    constructor(private name: string, private stream: IStreamFactory, private repository: ISnapshotRepository, private matcher: IMatcher) {
        this.subject = new Subject<T>();
    }

    run(): void {
        if (this.isDisposed)
            throw new Error(`${name}: cannot run a disposed projection`);

        if (this.subscription !== undefined)
            return;

        let snapshot = this.repository.getSnapshot<T>(this.name);
        if (snapshot !== Snapshot.Empty)
            this.state = snapshot.memento;
        else
            this.state = this.matcher.match(SpecialNames.Init)();
        this.subject.onNext(this.state);

        this.subscription = this.stream.from(snapshot.lastEvent).subscribe((event: any) => {
            try {
                this.state = this.matcher.match(event.name)(this.state, event);
                this.subject.onNext(this.state);
            } catch (error) {
                this.subject.onError(error);
                this.stop();
            }
        });
    }

    stop(): void {
        this.dispose();
    }

    dispose(): void {
        this.isDisposed = true;
        this.subscription.dispose();
        this.subject.onCompleted();
        this.subject.dispose();
    }

    subscribe(observer: Rx.IObserver<T>): Rx.IDisposable
    subscribe(onNext?: (value: T) => void, onError?: (exception: any) => void, onCompleted?: () => void): Rx.IDisposable
    subscribe(observerOrOnNext?: (Rx.IObserver<T>) | ((value: T) => void), onError?: (exception: any) => void, onCompleted?: () => void): Rx.IDisposable {
        if (isObserver(observerOrOnNext))
            return this.subject.subscribe(observerOrOnNext);
        else
            return this.subject.subscribe(observerOrOnNext, onError, onCompleted);
    }
}

function isObserver<T>(observerOrOnNext: (Rx.IObserver<T>) | ((value: T) => void)): observerOrOnNext is Rx.IObserver<T> {
    return (<Rx.IObserver<T>>observerOrOnNext).onNext !== undefined;
}
