let stripe, session_id;

$('#loading').hide();
$(document).ready(function () {
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
      })
    //$('#loading').show();
    $.get("user-info", function (data) {
        data = JSON.parse(data);
        document.title = data.name;
        document.querySelector('#user_name').textContent = data.discord_name;
        document.querySelector('#user_image').src = data.discord_image;
        $('#user_email').text(data.discord_email);
        $('#discord_status').text(data.discord_status);
        $('#plan_price').text(data.plan_price);
        $('#plan_status').text(data.plan_status);
        $('.group_image').attr('src',data.logo);
        $('#background').css("background-image", "url('" + data.background_url + "')");
        $('.group_name').each(function() { 
            $(this)[0].textContent = "  " + data.name; 
        });
        if (data.card) {
            $('#remove_card_card').show();
        } else {
            $('#link_card_card').show();
        }
        stripe = Stripe(data.stripePublicKey);
        session_id = data.session_id;
        document.getElementsByTagName("html")[0].style.visibility = "visible";
        if (data.membership) {
            $('.membership').show();
        } else {
            $('.unauthenticated').show();
        }
    });
    //$('#loading').hide();
    $('#pause_subscription_button').click(function(e){
        e.preventDefault();
        $('#loading').show();
        $("#pause_button").prop('id', 'resume_button');
        $('#resume_button').text("Resume Subscription");
        $("#resume_button").attr('data-target', '#resume_subscription_modal');
        $('#pause_subscription_modal').modal('hide');
        $.post("pause-subscription", function (data) {
            data = JSON.parse(data);
        });
        $('#loading').hide();
    });
    $('#resume_subscription_button').click(function(e){
        e.preventDefault();
        $("#resume_button").prop('id', 'pause_button'); 
        $('#pause_button').text("Pause Subscription");
        $("#pause_button").attr('data-target', '#pause_subscription_modal');
        $('#resume_subscription_modal').modal('hide')
    });
    $('#link_card_button').click(function(e){
        e.preventDefault();
        redirectToCheckout();
    });
    $('#remove_card_button').click(function(e){
        e.preventDefault();
        $('#loading').show();
        $('#remove_card_modal').modal('hide');
        $.post("remove-card", function (data) {
            data = JSON.parse(data);
        });
        $('#remove_card_card').hide();
        $('#link_card_card').show();
        $('#loading').hide();
    });
    $('#purchase_button').click(function(e){ 
        e.preventDefault();
        window.location = '/purchase';
    });
    //$('.body').show();
});

function redirectToCheckout() {
    stripe.redirectToCheckout({
        sessionId: session_id
    }).then(function (result) {
        // If `redirectToCheckout` fails due to a browser or network
        // error, display the localized error message to your customer
        // using `result.error.message`.
    });
}

function logout() {
    location.href = 'logout';
  }