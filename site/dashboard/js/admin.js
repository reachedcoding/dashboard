let stripe, session_id;

$('#loading').hide();
$(document).ready(function () {
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    })
    //$('#loading').show();
    $.get("admin-info", function (data) {
        data = JSON.parse(data);
        document.title = data.name;
        document.querySelector('#user_name').textContent = data.discord_name;
        document.querySelector('#user_image').src = data.discord_image;
        $('#user_email').text(data.discord_email);
        $('.group_image').attr('src', data.logo);
        $('#background').css("background-image", "url('" + data.background_url + "')");
        $('.group_name').each(function () {
            $(this)[0].textContent = "  " + data.name;
        });
        document.getElementsByTagName("html")[0].style.visibility = "visible";
    });

    $.get("admin-users", function (data) {
        data = JSON.parse(data);
        let now = new Date();
        $.each(data, function (k, v) {
            v.first_login = new Date(v.first_login);
            let user_html = '';
            user_html += '<div class="col-md-6" style="margin-bottom:1rem;">';
                user_html += '<div class="card">';
                    user_html += '<div class="card-body">';
                        user_html += '<div class="row">';
                            user_html += '<div class="col-md-1">';
                                user_html += `<img src="https://cdn.discordapp.com/avatars/${v.discord.id}/${v.discord.avatar}" 
                                width="40" height="40" class="d-inline-block align-middle image-cropper" alt=""> `;
                            user_html += '</div>';
                            user_html += '<div class="col-md-8">';
                                user_html += `<h4>${v.discord.username + '#' + v.discord.discriminator}</h4>`;
                            user_html += '</div>';
                            user_html += '<div class="col-md-3">';
                                user_html += `Joined ${((now - v.first_login) / (1000 * 60 * 60 * 24)).toFixed(2)} days ago`;
                                user_html += `<button type="button" class="btn btn-dark btn-block btn-lg views" data-placement="top" title="View User">
                                View
                                </button>`;
                            user_html += '</div>';
                        user_html += '</div>';
                    user_html += '</div>';
                user_html += '</div>';
            user_html += '</div>';
            $('#user_list').append(user_html);
            
            console.log(k + ': ');
            console.log(v);
        });
        $('views').on('click', 'btn', function(){
            console.log(this);
            // do something here
        });
        console.log(data);
    });

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
});


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
