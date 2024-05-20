const AWS = require('aws-sdk');
const { generateRandomString } = require('./nameGenerator');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccesssKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const uploadFile = async (file) => {
    const randomKey = `${generateRandomString(16)}`;

    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: randomKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
    };

    try {
        await s3.upload(params).promise();
        const filename = params.Key;
        return filename;
    } catch (error) {
        console.log(error);
        return "error";
    };
};

module.exports = { uploadFile };