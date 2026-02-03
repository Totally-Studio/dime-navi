export const isJSON = (str: string): boolean => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

export const formatResponseToHtml = (response: string): string => {
    // Convert Markdown headers to HTML
    let html = response.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Convert bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert bullet points
    html = html.replace(/^\* (.*$)/gim, '<ul>\n<li>$1</li>\n</ul>');
    html = html.replace(/<li>(.*?)<\/li>\n<ul>/gim, '<li>$1</li>'); // Join adjacent lists

    // Convert numbered lists
    html = html.replace(/^\d+\. (.*$)/gim, '<ol>\n<li>$1</li>\n</ol>');
    html = html.replace(/<li>(.*?)<\/li>\n<ol>/gim, '<li>$1</li>'); // Join adjacent lists

    // Convert code blocks
    html = html.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');

    // Add paragraphs
    html = html.split('\n').map(p => `<p>${p}</p>`).join('');

    return html;
};