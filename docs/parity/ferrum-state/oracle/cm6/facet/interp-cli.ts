// Runs one scenario of interp.ts from argv[2] (a JSON string) and prints the output; used to check a fixture by hand.
import {run} from "./interp"
console.log(JSON.stringify(run(JSON.parse(process.argv[2]))))
