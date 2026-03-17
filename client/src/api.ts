
export const getServerInfo = async (): Promise<{
    server_name: string;
    php_version: string;
}> => {
    const response = await fetch('/api/handler.php');

    const isOk = response.ok;

    if (!isOk) {
        throw new Error(`Failed to fetch server info: ${response.status} ${response.statusText}`);
    }

    const data = await response.text();
    return JSON.parse(data);
}
