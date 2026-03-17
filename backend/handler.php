<?php

    $request_route = $_SERVER['PHP_SELF'];
    $request_method = $_SERVER['REQUEST_METHOD'];

    $data = array(
        'server_name' => $_SERVER['SERVER_NAME'],
        'php_version' => phpversion()
    );

    // echo("Received request for route: $request_route with method: $request_method");
    
    header('Content-Type: application/json');
    http_response_code(200);
    echo(json_encode($data));


    if ($request_route) {
    }
?>

