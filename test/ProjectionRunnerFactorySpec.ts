import "reflect-metadata";
import expect = require("expect.js");
import IProjectionRunnerFactory from "../scripts/projections/IProjectionRunnerFactory";
import ProjectionRunnerFactory from "../scripts/projections/ProjectionRunnerFactory";
import MockProjectionDefinition from "./fixtures/definitions/MockProjectionDefinition";
import {IProjectionRunner} from "../scripts/projections/IProjectionRunner";
import Dictionary from "../scripts/common/Dictionary";
import {IIdempotenceFilter} from "../scripts/events/IdempotenceFilter";

describe("ProjectionRunnerFactory, given a projection definition", () => {

    let subject: IProjectionRunnerFactory;
    let holder: Dictionary<IProjectionRunner<any>>;
    let filterHolder: Dictionary<IIdempotenceFilter>;

    beforeEach(() => {
        holder = {};
        filterHolder = {};
        subject = new ProjectionRunnerFactory(null, holder, filterHolder);
    });

    context("when all the required properties are defined", () => {
        it("should save the projection runner into the projections runner holder", () => {
            let projectionRunner = subject.create(new MockProjectionDefinition().define());

            expect(holder["Mock"]).to.be(projectionRunner);
        });

        it("should save the idempotence filter into a dictionary", () => {
            subject.create(new MockProjectionDefinition().define());

            expect(filterHolder["Mock"]).to.be.ok();
        });
    });
});
