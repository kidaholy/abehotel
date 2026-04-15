import { connectDB } from './lib/db.js';
import Floor from './lib/models/floor.js';

async function run() {
  await connectDB();
  const floors = await Floor.find({});
  console.log(JSON.stringify(floors.map(f => ({
    id: f._id, 
    num: f.floorNumber, 
    desc: f.description
  })), null, 2));
  process.exit(0);
}
run();
