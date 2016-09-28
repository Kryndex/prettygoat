import {ISnapshotStrategy} from "../snapshots/ISnapshotStrategy";
import IFilterStrategy from "../filters/IFilterStrategy";
import {IEvent} from "../streams/Event";

export interface IWhen<T extends Object> {
    $init?:() => T;
    $any?:(s:T, payload:Object, event?:IEvent) => T;
    [name:string]:(s:T, payload:Object, event?:IEvent) => T;
}

export interface ISplit {
    $default?:(e:Object) => string;
    [name:string]:(e:Object) => string;
}

export interface IProjection<T> {
    name:string;
    split?:ISplit;
    definition:IWhen<T>;
    snapshotStrategy?:ISnapshotStrategy;
    filterStrategy?: IFilterStrategy<T>;
}
