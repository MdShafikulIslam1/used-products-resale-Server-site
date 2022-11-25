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
        //Store buyers booking data on db using post method
        app.post('/bookings', async (req, res) => {
            const data = req.body;
            const result = await buyerBookingsCollection.insertOne(data);
            res.send(result);
        });
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