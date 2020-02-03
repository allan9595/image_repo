//import necessary files and modules
const express = require('express');
const fs = require('fs');
const url = require('url');
const router = express.Router();
const Product = require('../../models').Product;
const multer  = require('multer')
const uuidv4 = require('uuid/v4');
const path = require('path');
const FileType = require('file-type');
const Sequelize = require('sequelize');
const aws = require('aws-sdk');
const validator = require('validator');
    
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

    //hold information for res 
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

//upload an image with proper validation
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


//delete one selected image
router.delete('/product/:id', (req, res) => {
    //validate input

    //find the record from the provided id
    Product.findByPk(req.params.id).then((product) => {
        
        //retrieve the product then delete the instance on s3 bucket
        const key = product.productImageURL.split('/').slice(-2)[0] + '/' + product.productImageURL.split('/').slice(-2)[1];
    
        aws.config.setPromisesDependency(); //enable the aws-sdk promise

        //configure the aws
        aws.config.update({
            accessKeyId: process.env.ACCESSKEYID,
            secretAccessKey: process.env.SECRETACCESSKEY,
            region: process.env.REGION
        });

        //configure s3
        const s3 = new aws.S3();
        const params = {
            Bucket:process.env.BUCKET_NAME,
            Key: key
        }
        
        //destory the s3 object which is the image
        s3.deleteObject(params, (err, data) => {
            if (err) {
                // an error occurred
                res.status(500).json({msg: "An error occurred while deleting"},err)
            }else{
                //destory the product stored in db
                Product.destroy({
                    where: {
                        id: req.params.id
                    }
                }).then(() => {
                    res.status(200).json({msg: "Delete success!"})
                });
            }
        });
    }).catch((e) => {
        res.status(400).json({error: e})
    });
})

//delete mutiple selected images in one http request

router.delete('/products/*', (req, res) => {
    //id need filter for security reason

    let path = url.parse(req.url).pathname;
    
    // split and remove empty element;
    path = path.split('/').filter((e) => {
        return e.length > 0;
    })

     // remove the first component 'products'
    productIds = path.slice(1);
   
    //delet all products in db and s3 provided by user
    Product.findAll({
        where:{
            id: productIds
        }
    }).then((products) => {
        
        if(products.length === 0){
            throw Error;
        }
        let productArray = [];

        if(products){
            products.forEach((element,index) => {
                
                //retrieve the product then delete the instance on s3 bucket
                //parse each url
                let key = element.dataValues.productImageURL.split('/').slice(-2)[0] + '/' + element.dataValues.productImageURL.split('/').slice(-2)[1];
                productArray.push({Key: key});
                Product.destroy({
                    where: {
                        productImageURL: element.dataValues.productImageURL
                    }
                }).catch((e) => {
                    res.status(400).json({msg: "Error on DB"});
                })
            
            })
        };

        //delet from s3 in one request
        aws.config.setPromisesDependency(); //enable the aws-sdk promise

        //configure the aws
        aws.config.update({
            accessKeyId: process.env.ACCESSKEYID,
            secretAccessKey: process.env.SECRETACCESSKEY,
            region: process.env.REGION
        });

        //configure s3
        const s3 = new aws.S3();
        const params = {
            Bucket:process.env.BUCKET_NAME,
            Delete: {
                Objects: productArray,
                Quiet: false
            } 
        }

        s3.deleteObjects(params, function(err, data) {
            if (err){
                res.status(500).json({msg: "An error occurred while deleting"},err)
            }else {
                res.status(200).json({msg: "Delete success!"})
            }
          }
        );
    }).catch((e) => {
        res.status(500).json({msg: "An error occurred while deleting"})
    })


})


module.exports = router;