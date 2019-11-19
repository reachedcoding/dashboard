if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY;

const stripe = require("stripe")(stripeSecretKey);
const uuidv4 = require('uuid/v4');
var price = price * 100;

module.exports = class Stripe  {

renew(id) {
  stripeHandler.open({
    amount: price
  });
}

//charges once
async single_charge(amount, currency, source, description){
  let payment_id = uuidv4();
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
          return false;
        }
        console.log(charge);
  });
}

//Creates a customer: input customer information
async create_customer(){
  let id = uuidv4();
  let customer = await stripe.customers.create(
  {
    description: 'Customer for jenny.rosen@example.com',
    name: 'Shivam'
  },{
    idempotency_key: id
  });
  return customer.id;
}

//creates a subscribtion: input customer id
subscribe(plan, customer_id) {
  let id = uuidv4();
  stripe.subscriptions.create(
    {
      customer: customer_id,
      items: [{ plan: plan}],
    },{
      idempotency_key: id
    },
    function (err, subscription) {
      if(err){
        console.log(err.message);
        return false;
      }
        console.log(subscription);
    }
  );
}

//retrieves customer id: input customer id
retrieve_customer(cus_id) {
  stripe.customers.retrieve(
  'cus_GCkiW9o3XyCwNf',
  function(err, customer) {
    // asynchronously called
  }
);
}

//Cancels a subscription: input customer id
cancel_subscription(cus_id) {
  let id = uuidv4();
  stripe.subscriptions.del(
    cus_id,{
      idempotency_key: id
    },
    function (err, confirmation) {
      if(err){
        console.log(err.message);
        return false;
      }
    });
}
}