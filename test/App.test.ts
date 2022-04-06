import * as AWS from "aws-sdk"
import {bucketName, region} from "../src/lambda/Utils"
import parsePath = require("parse-filepath")
import * as fs from "fs";
import {isDefined} from "@pstorm/aws-cdk/cdk/Utils";


const s3: AWS.S3 = new AWS.S3({region: region})

test("test multi-part upload video", async(done) => {
    const filePath: string = "test/videos/sample_1280x720_surfing_with_audio.mpeg"
    const {name, ext}: parsePath.ParsedPath = parsePath(filePath)
    const objectKey: string = `movies/${name}${ext}`
    console.log(`Starting multi-part upload for ${filePath}`)
    const multipartUploadInput: AWS.S3.Types.CreateMultipartUploadRequest = {
        Bucket: bucketName,
        Key: objectKey
    }
    const output: AWS.S3.Types.CreateMultipartUploadOutput =
        await s3.createMultipartUpload(multipartUploadInput).promise()
    if (!isDefined(output.UploadId)) fail("createMultipartUpload returned no upload id")
    const uploadId: string = output.UploadId
    let chunkCount: number = 0
    let uploadParts: {ETag?: string, PartNumber: number, chunk: Buffer | string}[] = []
    await new Promise<void>((resolve) => {
        const readStream: fs.ReadStream = fs.createReadStream(filePath, {highWaterMark: 10000*1024})
        readStream.on("data", (chunk) => {
            chunkCount = chunkCount + 1
            const thisChunkCount = chunkCount
            console.log(`Obtaining part ${chunkCount}`)
            uploadParts = uploadParts.concat({PartNumber: thisChunkCount, chunk: chunk})
        })
        readStream.on("error", (error) => fail(error))
        readStream.on("end", () => resolve())
    })
    await Promise.all(uploadParts.map(async part => {
        console.log(`Uploading part ${part.PartNumber}`)
        const uploadPartInput: AWS.S3.UploadPartRequest = {
            Body: part.chunk,
            Bucket: bucketName,
            Key: objectKey,
            PartNumber: part.PartNumber,
            UploadId: uploadId
        }
        const output: AWS.S3.Types.UploadPartOutput = await s3.uploadPart(uploadPartInput).promise()
        if (!isDefined(output.ETag)) fail("uploadPart returned no Etag")
        part.ETag = output.ETag
        console.log(`Part ${part.PartNumber} successfully uploaded!`)
    }))
    console.log("Completing the multi-part upload...")
    const completeMultipartUploadInput: AWS.S3.Types.CompleteMultipartUploadRequest = {
        Bucket: bucketName,
        Key: objectKey,
        UploadId: uploadId,
        MultipartUpload: {
            Parts: uploadParts.map(part => {return {ETag: part.ETag, PartNumber: part.PartNumber}})
        }
    }
    await s3.completeMultipartUpload(completeMultipartUploadInput).promise()
    console.log("Multi-part upload finished!")
    done()
}, 1000000)
