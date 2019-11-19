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

async function single_charge(amount, currency, source, description){
  await stripe.charges.create({
    amount: 2000,
    currency: "usd",
    source: "tok_visa", // obtained with Stripe.js
    description: "Charge for jenny.rosen@example.com"
  }, {
    idempotency_key: uuidv4()
  }, function(err, charge) {
        switch (err) {
        case 'StripeCardError':
          // A declined card error
          err.message; // => e.g. "Your card's expiration year is invalid."
          break;
        case 'StripeRateLimitError':
          // Too many requests made to the API too quickly
          break;
        case 'StripeInvalidRequestError':
          // Invalid parameters were supplied to Stripe's API
          break;
        case 'StripeAPIError':
          // An error occurred internally with Stripe's API
          break;
        case 'StripeConnectionError':
          // Some kind of error occurred during the HTTPS communication
          break;
        case 'StripeAuthenticationError':
          // You probably used an incorrect API key
          break;
        default:
          // Handle any other types of unexpected errors
          break;
        }
        console.log(charge);
  });
}


function subscribe(plan_, customer_) {
  stripe.subscriptions.create(
    {
      customer: customer_,
      items: [{ plan: plan_ }],
    },
    function (err, subscription) {
        switch (err.type) {
        case 'StripeCardError':
          // A declined card error
          err.message; // => e.g. "Your card's expiration year is invalid."
          break;
        case 'StripeRateLimitError':
          // Too many requests made to the API too quickly
          break;
        case 'StripeInvalidRequestError':
          // Invalid parameters were supplied to Stripe's API
          break;
        case 'StripeAPIError':
          // An error occurred internally with Stripe's API
          break;
        case 'StripeConnectionError':
          // Some kind of error occurred during the HTTPS communication
          break;
        case 'StripeAuthenticationError':
          // You probably used an incorrect API key
          break;
        default:
          // Handle any other types of unexpected errors
          break;
        }
        console.log(subscription);
    }
  );
}

single_charge();

function cancel_subscription(id) {
  stripe.subscriptions.del(
    id,
    function (err, confirmation) {

    });
}
