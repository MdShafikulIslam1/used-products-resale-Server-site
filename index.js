const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();


const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qg5qmf2.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {

        const categoriesCollection = client.db('usedProducts').collection('categories');
        const allProductsCollection = client.db('usedProducts').collection('allProducts');
        const buyerBookingsCollection = client.db('usedProducts').collection('buyerBookings');
        const usersCollection = client.db('usedProducts').collection('users');
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
        })
        //My order data loaded api( using email )

        app.get('/bookings/myOrders', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await buyerBookingsCollection.find(query).toArray();
            res.send(result);
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