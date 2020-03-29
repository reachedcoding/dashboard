let roles,releases;
$('#loading').hide();
$(document).ready(function () {
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    })
    //$('#loading').show();
    $.get("admin-info", function (data) {
        document.title = data.name;
        document.querySelector('#admin_name').textContent = data.discord_name;
        document.querySelector('#admin_image').src = data.discord_image;
        $('#admin_email').text(data.discord_email);
        $('.group_image').attr('src', data.logo);
        $('#background').css("background-image", "url('" + data.background_url + "')");
        $('.group_name').each(function () {
            $(this)[0].textContent = "  " + data.name;
        });
        document.getElementsByTagName("html")[0].style.visibility = "visible";
    });

    // Users
    $.get("admin-users", function (data) {
        let now = new Date();
        $.each(data, function (k, v) {
            v.first_login = new Date(v.first_login);
            let user_html = '';
            user_html += '<div class="col-xl-6" style="margin-bottom:1rem;">';
            user_html += '<div class=" grd-block">';
            user_html += '<div class="card-body">';
            user_html += '<div class="row">';
            user_html += '<div class="col-md-9 center">';
            user_html += `<h4><img src="https://cdn.discordapp.com/avatars/${v.discord.id}/${v.discord.avatar}" 
                                width="40" height="40" class="d-inline-block align-middle image-cropper" alt=""> `;
            user_html += `${v.discord.username + '#' + v.discord.discriminator}</h4>`;
            user_html += '</div>';
            user_html += '<div class="col-md-3 center">';
            user_html += `Joined ${((now - v.first_login) / (1000 * 60 * 60 * 24)).toFixed(2)} days ago`;
            user_html += `<button type="button" class="btn btn-dark btn-block btn-lg views" data-placement="top" title="View User" data-id="${v.discord.id}">
                                View
                                </button>`;
            user_html += '</div>';
            user_html += '</div>';
            user_html += '</div>';
            user_html += '</div>';
            user_html += '</div>';
            $('#user_list').append(user_html);

        });
        $(document).on('click', '.views', function () {
            let discord_id = $(this).data('id');
            $.get(`admin-user?id=${discord_id}`, function (data) {
                let name = `${data.discord.username}#${data.discord.discriminator}`;
                let discord_image = `https://cdn.discordapp.com/avatars/${data.discord.id}/${data.discord.avatar}`;
                let email = data.discord.email;
                let customer_id = data.customer_id;
                let first_login = data.first_login;
                let card = data.card;
                let membership = data.membership;
                let admin = data.admin;

                $('#user_name').text(name);
                $('#user_image').attr('src',discord_image);
                $('#user_email').text(email);
                $('#user_first_login').text(new Date(first_login));
                $('#user_stripe_customer_id').text(customer_id);
                $('#user_membership').text(membership);
                $('#user_card').text(card);
                $('#user_admin').text(admin);


                $('#user-description-tab').tab('show');
            });
        });
    });

    // Releases

    updateReleaseList();
    $('#create_release_button').click(function(e) {
        let name = $("#release_name")[0].value;
        let type = $('#release_type').children("option:selected").text();
        let role_name = $('#release_role').children("option:selected").text();
        let role_id = $('#release_role').children("option:selected").data('id');
        let price = $("#release_price")[0].value;
        let amount = $("#release_amount")[0].value;
        let active = $('#release_active').children("option:selected").text();
        if (active == "Yes") {
            active = true;
        } else {
            active = false;
        }
        $.post("admin-releases", {
            name: name,
            type: type,
            role_name: role_name,
            role_id: role_id,
            price: price,
            amount: amount,
            active: active,
        }, function (data) {
            updateReleaseList();
        });
    });

    $(document).on('click', '.releases', function () {
        let name = $(this).data('name');
        let type = $(this).data('type');
        let role_name = $(this).data('role_name');
        let role_id = $(this).data('role_id');
        let price = $(this).data('price');
        let amount = $(this).data('amount');
        let active = $(this).data('active');

        $('#remove_release_button').data('name', name);
        $('#remove_release_button').data('type', type);
        $('#release_modal_name').text(name);
    });

    $('#remove_release_button').click(function () {
        let name = $(this).data('name');
        let type = $(this).data('type');
        $.post("admin-releases-remove", {name: name, type: type}, function (data) {
            updateReleaseList();
        });
    });

    // Keys

    
    // Roles

    updateRoleList();
    $('#create_role_button').click(function(e) {
        let name = $("#role_name")[0].value;
        let id = $("#role_id")[0].value;
        $.post("admin-roles", {name: name, id: id}, function (data) {
            updateRoleList();
        });
    });

    $(document).on('click', '.roles', function () {
        let name = $(this).data('name');
        let id = $(this).data('id');

        $('#remove_role_button').data('name', name);
        $('#remove_role_button').data('id', id);
        $('#role_name').text(name);
    });

    $('#remove_role_button').click(function () {
        let name = $(this).data('name');
        let id = $(this).data('id');
        $.post("admin-roles-remove", {name: name, id: id}, function (data) {
            updateRoleList();
        });
    });

    // Graph
    $('#chart_type').change(function () {
        myChart.destroy();
        if ($(this).prop('checked')) {
            myChart = new Chart(ctx, {
                type: 'line',
                data: chart_data,
                options: chart_options
            });
        } else {
            myChart = new Chart(ctx, {
                type: 'bar',
                data: chart_data,
                options: chart_options
            });
        }
    });

    // Contact
});

function updateRoleList() {
    $('#role_list').empty();
    $('#release_role').empty();
    $.get("admin-roles", function (data) {
        let now = new Date();
        roles = data;
        $.each(data, function (k, v) {
            let created = new Date(v.created);
            let user_html = '';
            user_html += '<div class="col-xl-6" style="margin-bottom:1rem;">';
                user_html += '<div class=" grd-block">';
                    user_html += '<div class="card-body">';
                        user_html += '<div class="row">';
                            user_html += '<div class="col-md-9 center">';
                                user_html += `<h4>${v.name}</h4>`;
                                user_html += '<div>';
                                    user_html += `${v.id}`;
                                user_html += '</div>';
                            user_html += '</div>';
                            user_html += '<div class="col-md-3 center">';
                                user_html += `Created ${((now - created) / (1000 * 60 * 60 * 24)).toFixed(2)} days ago`;
                                user_html += `<button type="button" class="btn btn-danger btn-block btn-lg roles" data-placement="top" title="Remove Role" data-name="${v.name}" data-id="${v.id}" data-toggle="modal" data-target="#remove_role_modal">
                                Remove
                                </button>`;
                            user_html += '</div>';
                        user_html += '</div>';
                    user_html += '</div>';
                user_html += '</div>';
            user_html += '</div>';
            $('#role_list').append(user_html);

            let role_html = '';
            role_html += `<option data-id="${v.id}">`;
            role_html += v.name;
            role_html += `</option>`;
            $('#release_role').append(role_html);
        });
    });
}

function updateReleaseList() {
    $('#release_list').empty();
    $.get("admin-releases", function (data) {
        let now = new Date();
        releases = data;
        $.each(data, function (k, v) {
            let created = new Date(v.created);
            let name = v.name;
            let type = v.type;
            let role_name = v.role_name;
            let role_id = v.role_id;
            let price = v.price;
            let amount = v.amount;
            let active = v.active;

            let user_html = '';
            user_html += '<div class="col-xl-6" style="margin-bottom:1rem;">';
                user_html += '<div class=" grd-block">';
                    user_html += '<div class="card-body">';
                        user_html += '<div class="row">';
                            user_html += '<div class="col-md-9 center">';
                                user_html += `<h4>${name}</h4>`;
                                user_html += `<b>Role</b>: ${role_name} - ${role_id}`;
                                user_html += `<br>`;
                                user_html += `<b>Type</b>: ${type}`;
                                user_html += `<br>`;
                                user_html += `<b>Price</b>: ${price.toFixed(2)}`;
                                user_html += `<br>`;
                                user_html += `<b>Amount Left</b>: ${amount}`;
                                user_html += `<br>`;
                                user_html += `<b>Active</b>: ${active}`;
                            user_html += '</div>';
                            user_html += '<div class="col-md-3 center">';
                                user_html += `Created ${((now - created) / (1000 * 60 * 60 * 24)).toFixed(2)} days ago`;
                                user_html += `<button type="button" class="btn btn-danger btn-block btn-lg releases" data-placement="top" title="Remove Role" 
                                data-name="${name}" data-type="${type}" data-role_name="${role_name}" data-role_id="${role_id}" data-price="${price}" data-amount="${amount}" data-active="${active}" 
                                data-toggle="modal" data-target="#remove_release_modal">
                                Remove
                                </button>`;
                            user_html += '</div>';
                        user_html += '</div>';
                    user_html += '</div>';
                user_html += '</div>';
            user_html += '</div>';
            $('#release_list').append(user_html);
        });
    });
}

function logout() {
    location.href = 'logout';
}

var ctx = document.getElementById('key_chart').getContext('2d');
var myChart;
function create_chart(type) {
    myChart = new Chart(ctx, {
        type: type,
    });
}
let chart_data = {
    labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
    datasets: [{
        label: '# of Votes',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)'
        ],
        borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1
    }]
};

let chart_options = {
    scales: {
        yAxes: [{
            ticks: {
                beginAtZero: true
            }
        }]
    }
};

myChart = new Chart(ctx, {
    type: 'bar',
    data: chart_data,
    options: chart_options
});
