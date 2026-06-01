import mongoose from "mongoose";
import Grid from "gridfs-stream";

let gfs, gridfsBucket;

const initGridFS = () => {
  const conn = mongoose.connection;
  
  conn.once('open', () => {
    // Initialize GridFS
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
      bucketName: 'recordings'
    });
    
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('recordings');
    
    console.log("✅ GridFS initialized for recording storage");
  });
};

const getGfs = () => gfs;
const getGridFSBucket = () => gridfsBucket;

export { initGridFS, getGfs, getGridFSBucket };