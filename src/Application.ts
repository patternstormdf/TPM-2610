import {Application, Lambda, S3, IAM} from "@pstorm/aws-cdk"
import {account, bucketName, prefixId, region, tags} from "./lambda/Utils"
import * as s3 from "aws-cdk-lib/aws-s3"


export const app: Application = Application.new(`${prefixId}-app`, account, region, "src/Application.ts")

const layer: Lambda.Layer = Lambda.Layer.new(`${prefixId}-layer`, "src/layers/videothumbnailer", tags)
app.addResource(layer)

//TODO differentiate folders
const lambdaPermissionsMovies: IAM.Permissions = new IAM.Permissions(
    ["s3:GetObject"],
    "Allow",
    [],
    [`arn:aws:s3:::${bucketName}/movies/*`]
)

const lambdaPermissionsThumbnails: IAM.Permissions = new IAM.Permissions(
    ["s3:PutObject"],
    "Allow",
    [],
    [`arn:aws:s3:::${bucketName}/thumbnails/*`]
)

const lambda: Lambda.Function = new Lambda.Function(
    `${prefixId}-lambda`,
    "src/lambda",
    tags,
    "Lambda.handler",
    undefined,
    400,
    15*60,
    [lambdaPermissionsMovies, lambdaPermissionsThumbnails],
    undefined,
    [layer])
app.addResource(lambda)

const listener: S3.Listener.Base = new S3.Listener.Lambda(`${prefixId}-s3-listener`, lambda)

const bucket: S3.Bucket = S3.Bucket.new(bucketName, tags)
bucket.addListener({
    listener: listener,
    filter: { prefix: "movies/"},
    event: s3.EventType.OBJECT_CREATED
})
app.addResource(bucket)

