const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { decode } = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.SK);

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());





//jwt verify middleware

function verifyJWT(req, res, next) {
    const authHeaders = req.headers.authorization;
    if (!authHeaders) {
        return res.status(401).send('unauthorized access');
    }
    const token = authHeaders.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbiden access' })
        }
        req.decoded = decoded;
    })
    next()
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qg5qmf2.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {

        const categoriesCollection = client.db('usedProducts').collection('categories');
        const allProductsCollection = client.db('usedProducts').collection('allProducts');
        const buyerBookingsCollection = client.db('usedProducts').collection('buyerBookings');
        const usersCollection = client.db('usedProducts').collection('users');
        const addProductsCollection = client.db('usedProducts').collection('addProducts');
        const paymentsCollection = client.db('usedProducts').collection('payments');




        //create jwt Token

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '2h' });
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        });


        //all categories loadded api 
        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        });
        //useing id loaded specific categories data for API
        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { category_id: id }
            const result = await allProductsCollection.find(query).toArray();
            res.send(result);
        });

        //get allUsers in my website
        app.get('/allUsers', async (req, res) => {
            const query = {};
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        });

        //check user is admin.if user is admin we send isAdmin is true unless false
        app.get('/allUsers/admin', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role == "admin" })
        });
        //check user is Seller.If user is seller we send isSeller is true unless false
        app.get('/allUsers/seller', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role == "seller" })
        });

        //order data load using a specefic order id ...a single order data loader API
        app.get('/dashboard/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await buyerBookingsCollection.findOne(query);
            res.send(result);
        })
        //payment api
        app.post("/create-payment-intent", async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });
        //store payment user transactioinId(paymentIntent.id),user name,user email etc on database for secure purpose
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.orderId;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            };
            const updateResult = await buyerBookingsCollection.updateOne(filter, updateDoc);
            res.send(result);
        });


        //My order data loaded api( using email )
        app.get('/bookings/myOrders', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbiden access' })
            }
            const query = { email: email };
            const result = await buyerBookingsCollection.find(query).toArray();
            res.send(result);
        });

        //get a specific field from a collection 
        app.get('/addProductsData', async (req, res) => {
            const query = {};
            const result = await addProductsCollection.find(query).project({ category_name: 1 }).toArray();
            res.send(result)
        });

        //load addProductsData all data using category_name query for API
        app.get('/addProductsData/:category_name', async (req, res) => {
            const category_name = req.params.category_name;
            const query = { category_name: category_name };
            const result = await addProductsCollection.find(query).toArray();
            res.send(result)
        })
        //store addProduct data on database
        app.post('/addProductsData', async (req, res) => {
            const data = req.body;
            const result = await addProductsCollection.insertOne(data);
            res.send(result)
        })

        //Store buyers booking data on db using post method
        app.post('/bookings', async (req, res) => {
            const data = req.body;
            const result = await buyerBookingsCollection.insertOne(data);
            res.send(result);
        });
        //store all users with their role such is he admin,seller,buyers? for api
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        //// make verified specific user(seller) by exact admin users for Api

        app.put('/allUsers/seller/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    verification: true
                }
            };
            const data = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(data)
        })

        // make admin specific user by exact admin users for Api
        app.put('/allusers/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const data = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(data)
        })
        //delete a specific id (user) by Admin action for API
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(err => console.log(err))





app.get('/', (req, res) => {
    res.send('Used resale products server site is runnig')
});

app.listen(port, () => {
    console.log(`used products server site is runnig on this port:${port}`);
});