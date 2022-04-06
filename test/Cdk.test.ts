import {app} from "../src/Application"

test("synth app", async(done) => {
    await app.synthetise("p2vtpm")
    done()
}, 1000000)

test("deploy app", async(done) => {
    await app.deploy("p2vtpm")
    done()
}, 1000000)

test("undeploy app", async(done) => {
    await app.undeploy("p2vtpm")
    done()
}, 1000000)
