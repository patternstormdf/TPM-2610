import {Context} from "aws-lambda"
import * as AWS from "aws-sdk"
import {bucketName, isDefined, region} from "./Utils"
import {createThumbnail} from "videothumbnailer"
import * as fs from "fs"
import * as stream from "stream"
import {S3Event} from "aws-lambda/trigger/s3"
import parsePath = require("parse-filepath")


const s3: AWS.S3 = new AWS.S3({region: region})

async function uploadThumbnail(filePath: string): Promise<string> {
    const {name, ext}: parsePath.ParsedPath = parsePath(filePath)
    const thumbnailKey: string = `thumbnails/${name}${ext}`
    console.log(`Uploading file ${filePath} to ${thumbnailKey}`)
    const thumbnailData: Buffer = fs.readFileSync(filePath)
    const params: AWS.S3.Types.PutObjectRequest = {
        Body: thumbnailData,
        Bucket: bucketName,
        Key: thumbnailKey
    }
    await s3.upload(params).promise()
    console.log("File successfully uploaded!")
    return thumbnailKey
}

async function downloadVideo(objectKey: string): Promise<string> {
    const {name, ext} : parsePath.ParsedPath = parsePath(objectKey)
    const filePath: string = `/tmp/${name}${ext}`
    console.log(`Downloading ${objectKey} to ${filePath}`)
    const params: AWS.S3.Types.GetObjectRequest = {
        Bucket: bucketName,
        Key: objectKey
    }
    await new Promise<void>((resolve) => {
        const readStream: stream.Readable = s3.getObject(params).createReadStream()
        readStream.on("error", (err: Error) => {
            throw new Error(`Could not download object ${objectKey} to ${filePath} error=${err.message}`)
        })
        let file: fs.WriteStream = fs.createWriteStream(filePath)
        file = readStream.pipe(file)
        file.on("error", (err: Error) => {
            throw new Error(`Could not download object ${objectKey} to ${filePath} error=${err.message}`)
        })
        file.on("finish", () => resolve())
    })
    console.log("Download complete!")
    return filePath
}

export async function handler(event: S3Event, context: Context): Promise<void> {
    console.log(`event=${JSON.stringify(event)}`)
    await Promise.all(event.Records.map(async record => {
        let videoPath: string | undefined
        let thumbnailPath: string | undefined
        try {
            const objectKey: string = record.s3.object.key
            console.log(`Processing object ${objectKey}...`)
            videoPath = await downloadVideo(objectKey)
            thumbnailPath = await createThumbnail(videoPath)
            await uploadThumbnail(thumbnailPath)
            console.log(`Object ${objectKey} successfully processed!`)
        } finally {
            try {
                console.log(`Attempting to delete ${videoPath}`)
                if (isDefined(videoPath)) fs.unlinkSync(videoPath)
                console.log(`${videoPath} successfully deleted!`)
            } catch(err) {
                console.log(`Could not delete file ${videoPath}`)
            } finally {
                try {
                    console.log(`Attempting to delete ${thumbnailPath}`)
                    if (isDefined(thumbnailPath)) fs.unlinkSync(thumbnailPath)
                    console.log(`${thumbnailPath} successfully deleted!`)
                } catch(err) {
                    console.log(`Could not delete file ${thumbnailPath}`)
                }
            }
        }
    }))
}
