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
        const directory = 'temp';

        //remove all the files form the server temp folder if the ext not good
        fs.readdir(directory, (err, files) => {
            if (err) throw err;

            for (const file of files) {
                fs.unlink(path.join(directory, file), err => {
                    if (err) throw err;
                });
            }
        });
        
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

    let uploadData = [];
    let errors = [];
    let errorsS3 = [];
    
    req.files.map(fileSingle => {

        FileType.fromStream(fs.createReadStream(fileSingle.path)) //append the file type to the end 
            .then(file => {

            //ACL: set the bucket as public readable
            //Bucket: the bucket name
            //body: open the file as a readable stream and set it to the Body
            //Key: the file name
            
            const params = {
                ACL: 'public-read',
                Bucket: process.env.BUCKET_NAME,
                Body: fs.createReadStream(fileSingle.path),
                Key: `products/${uuidv4()}.${file.ext}`,
                ContentType: fileSingle.mimetype,
                ContentDisposition: "inline"
            };
            
            //the actual s3 upload 
            s3.upload(params, (err, data) => {
                if (err) {
                    errorsS3.push(err);
                    //return a message to client if save to s3 failed
                    if(errorsS3.length == req.files.length){
                        res.status(500).json({ "message" : 'Error occured while trying to upload to S3 bucket'});
                    }
                }
                
                fs.unlinkSync(fileSingle.path); //delete the image on server after uploading
                
                if (data) {
                    let locationUrl = data.Location;
                    uploadData.push(data);
                    Product.create({ 
                            userId: req.body.userId,
                            name: req.body.name,
                            productImageURL: locationUrl 
                    }).catch(err => {
                        errors.push(err);
                    });
                    
                    //return a message to client after the upload finished
                    if(req.files.length == uploadData.length ){
                        res.status(201).json({ "message" : 'Products uploaded successfully'});
                    }

                    //return a message to client if save to db failed
                    if((req.files.length == uploadData.length) && errors.length > 0){
                        res.status(500).json({ "message" : 'Error occured while trying to save to DB'});
                    }
                }
            });
        }).catch(e => {
            res.status(500).json({ "message" : 'Error occured while upload the file, this might be the server side issue!'});
        })
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
        .array('image'),
        productUpload
  )


//delete one or more selected image
module.exports = router;