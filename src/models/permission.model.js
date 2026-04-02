const permissionSchema = new mongoose.Schema({
  key: {
    type: String,
    unique: true
  },
  module: String,
  description: String
});