if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY;

const stripe = require("stripe")("sk_test_4eC39HqLyjWDarjtT1zdp7dc");
const uuidv4 = require('uuid/v4');
var price = price * 100;


function renew(id) {
  stripeHandler.open({
    amount: price
  })
}

//charges once
async function single_charge(amount, currency, source, description){
  payment_id = uuidv4()
  await stripe.charges.create({
    amount: 2000,
    currency: "usd",
    source: "tok_visa", // obtained with Stripe.js
    description: "Charge for jenny.rosen@example.com"
  }, {
    idempotency_key: payment_id
  }, function(err, charge) {
        if(err){
          console.log(err.message);
          return;
        }
        console.log(charge);
  });
}

//Creates a customer: input customer information
async function create_customer(){
  id = uuidv4()
  stripe.customers.create(
  {
    description: 'Customer for jenny.rosen@example.com',
    name: 'Shivam'
  },{
    idempotency_key: id
  },
  function(err, customer) {
    console.log(customer);
  }
  );
}

//creates a subscribtion: input customer id
function subscribe(plan_, customer_id) {
  id = uuidv4()
  stripe.subscriptions.create(
    {
      customer: customer_id,
      items: [{ plan: plan_ }],
    },{
      idempotency_key: id
    },
    function (err, subscription) {
      if(err){
        console.log(err.message);
        return;
      }
        console.log(subscription);
    }
  );
}

//retrieves customer id: input customer id
function retrieve_customer(cus_id){
  stripe.customers.retrieve(
  'cus_GCkiW9o3XyCwNf',
  function(err, customer) {
    // asynchronously called
  }
);
}
create_customer();

//Cancels a subscription: input customer id
function cancel_subscription(cus_id) {
  id = uuidv4()
  stripe.subscriptions.del(
    cus_id,{
      idempotency_key: id
    },
    function (err, confirmation) {
      if(err){
        console.log(err.message);
        return;
      }
    });
}
