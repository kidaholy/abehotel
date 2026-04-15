import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
  await mongoose.connect(MONGODB_URI as string);
  const orders = await mongoose.connection.db?.collection('orders').find({ orderNumber: { $in: ['008', '007', '006'] } }).toArray();
  console.log(JSON.stringify(orders, null, 2));
  await mongoose.disconnect();
}

check();
