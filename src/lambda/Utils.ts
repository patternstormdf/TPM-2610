import {Application} from "@pstorm/aws-cdk"


export const account: string = "162174280605"
export const region: string = "us-east-1"

export const prefixId: string = "cpaniagua-aws-lambda-badge-task-3"

export const tags: Application.Resource.Tag[] = [
    {key: "owner", value : "claudi.paniagua@devfactory.com"},
    {key: "purpose", value: "https://devgraph-alp.atlassian.net/browse/TPM-2610"}
]

export const bucketName: string = `${prefixId}-bucket`


export function isDefined<T>(argument: T | undefined | null): argument is T {
    return (argument !== undefined) && (argument !== null)
}
