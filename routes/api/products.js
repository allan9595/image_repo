//import necessary files and modules
const express = require('express');
const fs = require('fs');
const router = express.Router();
const Product = require('../../models').Product;
const multer  = require('multer')
const uuidv4 = require('uuid/v4');
const path = require('path');
const FileType = require('file-type');
const Sequelize = require('sequelize');
const aws = require('aws-sdk')

//this portion of code upload the images from /tmp folder to s3, productUpload middleware
const productUpload = (req, res) => {
    
    //check if the file are valid ext from the req object
    if(req.fileValidationError) {
        return res.status(400).json({"message":req.fileValidationError}).end();
    }

    aws.config.setPromisesDependency(); //enable the aws-sdk promise

    //configure the aws
    aws.config.update({
        accessKeyId: process.env.ACCESSKEYID,
        secretAccessKey: process.env.SECRETACCESSKEY,
        region: process.env.REGION
    });

    //create a new s3 instance
    const s3 = new aws.S3();

    FileType.fromStream(fs.createReadStream(req.file.path)) //append the file type to the end prevent to prevent bad intend
        .then(file => {
            //ACL: set the bucket as public readable
            //Bucket: the bucket name
            //body: open the file as a readable stream and set it to the Body
            //Key: the file name
            const params = {
                ACL: 'public-read',
                Bucket: process.env.BUCKET_NAME,
                Body: fs.createReadStream(req.file.path),
                Key: `products/${uuidv4()}.${file.ext}`,
                ContentType: req.file.mimetype,
                ContentDisposition: "inline"
            };
            console.log(req.file);
            //the actual s3 upload 
            s3.upload(params, (err, data) => {
                if (err) {
                    console.log('Error occured while trying to upload to S3 bucket', err);
                }

                if (data) {
                    console.log(data);
                    fs.unlinkSync(req.file.path); // Empty temp folder after we upload all images to s3
                    const locationUrl = data.Location;
                    Product.create({ 
                            userId: req.body.userId,
                            name: req.body.name,
                            productImageURL: locationUrl 
                    })
                    .then(product => {
                        res.json({ message: 'Product created successfully', product });
                    })
                    .catch(err => {
                        console.log('Error occured while trying to save to DB', err);
                    });
                }
            });
        })
};

//following part is for the actual api

router
  .post('/product',multer(
        { 
            dest: 'temp/', 
            limits: { fieldSize: 8 * 1024 * 1024 },
            fileFilter: (req, file, callback) => {
                const ext = path.extname(file.originalname);
                if(ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
                    req.fileValidationError = 'Only images are allowed';
                }
                callback(null, true);
            } 
        })
        .single('image'),
        productUpload
  )

module.exports = router;