const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, '../articles');
const outputFile = path.join(__dirname, '../data.json');

function extractTitle(filePath, fileName) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const titleMatch = content.match(/<title>(.*?)<\/title>/i);
        if (titleMatch) return titleMatch[1];
        return fileName.replace(/\.html$/, '').replace(/-/g, ' ');
    } catch (err) {
        return fileName.replace(/\.html$/, '').replace(/-/g, ' ');
    }
}

function getCategory(fileName) {
    if (fileName.includes('2fa') || fileName.includes('2fa-')) return '2fa';
    if (fileName.includes('privacy')) return 'privacy';
    if (fileName.includes('password')) return 'password';
    return 'other';
}

function scanArticles() {
    if (!fs.existsSync(articlesDir)) {
        fs.mkdirSync(articlesDir, { recursive: true });
        console.log('Создана папка articles');
        return { twoFA: [], privacy: [], password: [], other: [] };
    }

    const files = fs.readdirSync(articlesDir);
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    
    const articles = {
        twoFA: [],
        privacy: [],
        password: [],
        other: []
    };
    
    htmlFiles.forEach(file => {
        const filePath = path.join(articlesDir, file);
        const title = extractTitle(filePath, file);
        const category = getCategory(file);
        
        articles[category].push({
            name: title,
            url: `articles/${file}`
        });
    });
    
    return articles;
}

function generate() {
    console.log('🔍 Сканирование папки articles...');
    const articles = scanArticles();
    
    const sections = [];
    let num = 1;
    
    if (articles.password.length > 0) {
        sections.push({
            num: num++,
            title: "Надёжный пароль",
            type: "simple",
            link: articles.password[0].url,
            linkText: "Перейти к инструкции →"
        });
    }
    
    if (articles.twoFA.length > 0) {
        sections.push({
            num: num++,
            title: "Двухфакторная аутентификация (2FA)",
            type: "submenu",
            id: "fa2",
            platforms: articles.twoFA
        });
    }
    
    if (articles.privacy.length > 0) {
        sections.push({
            num: num++,
            title: "Приватность профиля",
            type: "submenu",
            id: "privacy",
            platforms: articles.privacy
        });
    }
    
    if (articles.other.length > 0) {
        sections.push({
            num: num++,
            title: "Другие статьи",
            type: "submenu",
            id: "other",
            platforms: articles.other
        });
    }
    
    const output = { sections };
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    
    const total = articles.twoFA.length + articles.privacy.length + articles.password.length + articles.other.length;
    console.log(`Сгенерирован data.json (${total} статей, ${sections.length} разделов)`);
}

generate();
