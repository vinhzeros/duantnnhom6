var express = require('express');
var router = express.Router();
const connectDb=require('../model/db');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const stripeConfig = require('./stripe.config');
const Stripe = require('stripe');
const stripe = new Stripe(stripeConfig.stripeSecretKey);
//Đăng ký tài khoản với mã hóa mật khẩu bcrypt
const bcrypt = require('bcryptjs');
router.post('/register', async (req, res, next) => {
  const db = await connectDb();
  const userCollection = db.collection('users');
  const { email, password } = req.body;
  const user = await userCollection.findOne({ email });
  if (user) {
    return res.status(400).json({ message: "Email đã tồn tại" });
  }else
  {
    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = { email, password: hashPassword , role: 'user' };
    try {
      const result = await userCollection.insertOne(newUser);
      if (result.insertedId) {
        res.status(200).json({ message: "Đăng ký thành công" });
      } else {
        res.status(500).json({ message: "Đăng ký thất bại" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
    }
  }
 
});

//Kiểm tra token qua Bearer

router.get('/checktoken', async (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, 'secret', (err, user) => {
    if (err) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }
    res.status(200).json({ message: "Token hợp lệ" });
  }
  );
}
);


//lấy thông tin chi tiết user qua token
router.get('/detailuser', async (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, 'secret', async (err, user) => {
    if (err) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }
    const db = await connectDb();
    const userCollection = db.collection('users');
    const userInfo = await userCollection.findOne({ email: user.email });
    if (userInfo) {
      res.status(200).json(userInfo);
    } else {
      res.status(404).json({ message: "Không tìm thấy user" });
    }
  });
});
//check jwt
const jwt = require('jsonwebtoken');
const { url } = require('inspector');
router.post('/login', async (req, res, next) => {
  const db = await connectDb();
  const userCollection = db.collection('users');
  const { email, password } = req.body;
  const user = await userCollection.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "Email không tồn tại" });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).json({ message: "Mật khẩu không chính xác" });
  }
  const token = jwt.sign({ email: user.email, role: user.role }, 'secret', { expiresIn: '1h' });
  res.status(200).json({ token });
});
//Thiết lập nơi lưu trữ và tên file
let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/img')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
//Kiểm tra file upload
function checkFileUpLoad(req, file, cb){
if(!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)){
  return cb(new Error('Bạn chỉ được upload file ảnh'));
}
cb(null, true);
}
//Upload file
let upload = multer({ storage: storage, fileFilter: checkFileUpLoad });
//lấy danh mục
router.get('/categories', async(req, res, next)=> {
  const db=await connectDb();
  const categoryCollection=db.collection('categories');
  const categories=await categoryCollection.find().toArray();
  if(categories){
    res.status(200).json(categories);
  }else{
    res.status(404).json({message : "Không tìm thấy"})
  }
}
);
//thêm danh mục

router.post('/addcategories', async (req, res, next) => {
  const db = await connectDb();
  const categoriesCollection = db.collection('categories');
  const { name,status } = req.body;
  const newCategories = { name, status };
  try {
    const result = await categoriesCollection.insertOne(newCategories);

    // Check if insertedId exists (indicates successful insertion)
    if (result.insertedId) {
      res.status(200).json({ message: "Thêm danh mục thành công" });
    } else {
      res.status(500).json({ message: "Thêm danh mục thất bại" }); // Consider using 500 for unexpected errors
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" }); // Generic error message for user
  }
});
//sua danh muc
router.put('/updatecategories/:id', async (req, res, next) => {
  const db = await connectDb();
  const categoriesCollection = db.collection('categories');
  const id = new ObjectId(req.params.id);
  const { name, status} = req.body;
  let updatedCategories = { name,status }; 

  try {
    const result = await categoriesCollection.updateOne({ _id: id }, { $set: updatedCategories});
    if (result.matchedCount) {
      res.status(200).json({ message: "Sửa sản phẩm thành công" });
    } else {
      res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});
//Xóa danh mục
router.delete('/deletecategories/:id', async (req, res, next) => {
  const db = await connectDb();
  const categoriesCollection = db.collection('categories');
  const id = new ObjectId(req.params.id);
  try {
    const result = await categoriesCollection.deleteOne({ _id: id });
    if (result.deletedCount) {
      res.status(200).json({ message: "Xóa sản phẩm thành công" });
    } else {
      res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});
//Thêm sản phẩm
router.post('/addproduct', upload.single('image'), async (req, res, next) => {
  const db = await connectDb();
  const productCollection = db.collection('products');
  const { name, price, description, categoryId } = req.body;
  const image = req.file.originalname;
  const newProduct = { name, price, description, categoryId, image };

  try {
    const result = await productCollection.insertOne(newProduct);
  
    // Check if insertedId exists (indicates successful insertion)
    if (result.insertedId) {
      res.status(200).json({ message: "Thêm sản phẩm thành công" });
    } else {
      res.status(500).json({ message: "Thêm sản phẩm thất bại" }); // Consider using 500 for unexpected errors
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" }); // Generic error message for user
  }
});

//Xóa sản phẩm
router.delete('/deleteproduct/:id', async (req, res, next) => {
  const db = await connectDb();
  const productCollection = db.collection('products');
  const id = new ObjectId(req.params.id);
  try {
    const result = await productCollection.deleteOne({ _id: id });
    if (result.deletedCount) {
      res.status(200).json({ message: "Xóa sản phẩm thành công" });
    } else {
      res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

//Sửa sản phẩm
router.put('/updateproduct/:id', upload.single('image'), async (req, res, next) => {
  const db = await connectDb();
  const productCollection = db.collection('products');
  const id = new ObjectId(req.params.id);
  const { name, price, description, categoryId } = req.body;
  let updatedProduct = { name, price, description, categoryId }; 

  if (req.file) {
    const image = req.file.originalname;
    updatedProduct.image = image; //
  }

  try {
    const result = await productCollection.updateOne({ _id: id }, { $set: updatedProduct });
    if (result.matchedCount) {
      res.status(200).json({ message: "Sửa sản phẩm thành công" });
    } else {
      res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});



router.get('/productdetail/:id', async(req, res, next)=> {
  let id = new ObjectId(req.params.id);
  const db=await connectDb();
  const productCollection=db.collection('products');
  const product=await productCollection.findOne({_id:id});
  if(product){
    res.status(200).json(product);
  }else{
    res.status(404).json({message : "Không tìm thấy"})
  }
}
);
//Tìm kiếm theo sản phẩm
router.get('/search/:keyword', async(req, res, next)=> {
  const db=await connectDb();
  const productCollection=db.collection('products');
  const products=await productCollection.find({name: new RegExp(req.params.keyword, 'i')}).toArray();
  if(products){
    res.status(200).json(products);
  }else{
    res.status(404).json({message : "Không tìm thấy"})
  }
}
);
router.get('/products', async(req, res, next)=> {
  const db=await connectDb();
  const productCollection=db.collection('products');
  const products=await productCollection.find().toArray();
  if(products){
    res.status(200).json(products);
  }else{
    res.status(404).json({message : "Không tìm thấy"})
  }
});
//Lấy danh sách sản phẩm theo idcate
router.get('/productbycate/:idcate', async(req, res, next)=> {
  const db=await connectDb();
  const productCollection=db.collection('products');
  const products=await productCollection.find({categoryId:req.params.idcate}).toArray();
  if(products){
    res.status(200).json(products);
  }else{
    res.status(404).json({message : "Không tìm thấy"})
  }
}
);
// Lấy danh sách người dùng
router.get('/users', async (req, res, next) => {
  const db = await connectDb();
  const userCollection = db.collection('users');
  const users = await userCollection.find().toArray();
  if (users.length > 0) {
    res.status(200).json(users);
  } else {
    res.status(404).json({ message: "Không tìm thấy người dùng" });
  }
});

// Thêm người dùng
router.post('/addusers', async (req, res, next) => {
  const db = await connectDb();
  const userCollection = db.collection('users');
  const {  email, password } = req.body;
  const newUser = { email, password };
  
  try {
    const result = await userCollection.insertOne(newUser);
    if (result.insertedId) {
      res.status(200).json({ message: "Thêm người dùng thành công" });
    } else {
      res.status(500).json({ message: "Thêm người dùng thất bại" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

// Sửa thông tin người dùng
router.put('/updateusers/:id', async (req, res, next) => {
  const db = await connectDb();
  const userCollection = db.collection('users');
  const id = new ObjectId(req.params.id);
  const { email, password } = req.body;
  const updatedUser = {  email, password };

  try {
    const result = await userCollection.updateOne({ _id: id }, { $set: updatedUser });
    if (result.matchedCount) {
      res.status(200).json({ message: "Sửa thông tin người dùng thành công" });
    } else {
      res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

// Xóa người dùng
router.delete('/deleteusers/:id', async (req, res, next) => {
  const db = await connectDb();
  const userCollection = db.collection('users');
  const id = new ObjectId(req.params.id);

  try {
    const result = await userCollection.deleteOne({ _id: id });
    if (result.deletedCount) {
      res.status(200).json({ message: "Xóa người dùng thành công" });
    } else {
      res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

// Thanh toán
router.post('/checkout', async (req, res) => {
  const { items } = req.body;

  try {
    // Kiểm tra nếu items không hợp lệ hoặc rỗng
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for checkout' });
    }

    // Kết nối tới cơ sở dữ liệu
    const db = await connectDb();
    const paymentData = { items, createdAt: new Date() };

    // Lưu thông tin thanh toán vào MongoDB
    const paymentsCollection = db.collection('payments');
    const paymentRecord = await paymentsCollection.insertOne(paymentData);

    // Tạo một phiên thanh toán qua Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'vnd',
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100), // Đơn vị là vnd, chuyển đổi sang số nguyên
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
    });

    // Phản hồi với ID phiên thanh toán
    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;