const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, '../articles');
const outputFile = path.join(__dirname, '../data.json');

function extractTitle(filePath, fileName) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const titleMatch = content.match(/<title>(.*?)<\/title>/i);
        if (titleMatch) return titleMatch[1].trim();
        return fileName.replace(/\.html$/, '').replace(/-/g, ' ');
    } catch (err) {
        return fileName.replace(/\.html$/, '').replace(/-/g, ' ');
    }
}

function detectCategory(fileName, title) {
    const lowerName = fileName.toLowerCase();
    const lowerTitle = title.toLowerCase();
    
    if (lowerName.includes('password') || lowerTitle.includes('пароль')) {
        return { main: 'password', name: 'Надёжный пароль', type: 'simple' };
    }
    
    if (lowerName.includes('2fa') || lowerName.includes('twofactor') || 
        lowerTitle.includes('двухфактор')) {
        let platform = '';
        if (lowerName.includes('telegram') || lowerTitle.includes('telegram')) platform = 'Telegram';
        else if (lowerName.includes('vk') || lowerTitle.includes('вконтакте')) platform = 'VK';
        else if (lowerName.includes('max') || lowerTitle.includes('мах')) platform = 'МАХ';
        else platform = title;
        
        return { main: '2fa', name: platform, type: 'submenu', group: 'Двухфакторная аутентификация' };
    }
    
    if (lowerName.includes('privacy') || lowerTitle.includes('приватн')) {
        let platform = '';
        if (lowerName.includes('telegram') || lowerTitle.includes('telegram')) platform = 'Telegram';
        else if (lowerName.includes('vk') || lowerTitle.includes('вконтакте')) platform = 'VK';
        else if (lowerName.includes('max') || lowerTitle.includes('мах')) platform = 'МАХ';
        else platform = title;
        
        return { main: 'privacy', name: platform, type: 'submenu', group: 'Приватность профиля' };
    }
    
    if (lowerName.includes('fraud') || lowerTitle.includes('мошен')) {
        return { main: 'fraud', name: 'Мошеннические схемы', type: 'simple' };
    }
    
    if (lowerName.includes('hacked') || lowerTitle.includes('взлом')) {
        return { main: 'hacked', name: 'Действия при взломе аккаунта', type: 'simple' };
    }
    
    if (lowerName.includes('about') || lowerTitle.includes('автор')) {
        return { main: 'about', name: 'Об авторах', type: 'simple' };
    }
    
    const firstPart = lowerName.split('-')[0];
    if (firstPart && firstPart !== fileName) {
        return { main: firstPart, name: title, type: 'simple' };
    }
    
    return { main: 'other', name: title, type: 'simple' };
}

function scanArticles() {
    if (!fs.existsSync(articlesDir)) {
        fs.mkdirSync(articlesDir, { recursive: true });
        console.log('Создана папка articles');
        return { simpleSections: [], submenuGroups: {} };
    }

    const files = fs.readdirSync(articlesDir);
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    
    console.log(`Папка articles: ${articlesDir}`);
    console.log(`Найдено HTML файлов: ${htmlFiles.length}\n`);
    
    const simpleItems = [];
    const submenuItems = {};
    
    htmlFiles.forEach(file => {
        const filePath = path.join(articlesDir, file);
        const title = extractTitle(filePath, file);
        const category = detectCategory(file, title);
        
        console.log(`${file}`);
        console.log(`   Заголовок: ${title}`);
        console.log(`   Категория: ${category.main}`);
        
        if (category.type === 'simple') {
            simpleItems.push({
                id: category.main,
                title: category.name,
                originalTitle: title,
                url: `articles/${file}`,
                linkText: 'Подробнее →'
            });
            console.log(`   → Добавлен в простые разделы как "${category.name}"`);
        } else if (category.type === 'submenu') {
            if (!submenuItems[category.main]) {
                submenuItems[category.main] = {
                    title: category.group,
                    platforms: []
                };
            }
            submenuItems[category.main].platforms.push({
                name: category.name,
                url: `articles/${file}`
            });
            console.log(`   → Добавлен в подменю "${category.group}" как "${category.name}"`);
        }
        console.log('');
    });
    
    const simpleSections = [];
    const processedIds = new Set();
    
    simpleItems.forEach(item => {
        if (!processedIds.has(item.id)) {
            processedIds.add(item.id);
            simpleSections.push({
                id: item.id,
                title: item.title,
                url: item.url,
                linkText: item.linkText
            });
        }
    });
    
    return { simpleSections, submenuItems };
}

function generate() {
    console.log('Запуск генерации data.json\n');
    console.log('Сканирование папки articles...\n');
    
    const { simpleSections, submenuItems } = scanArticles();
    
    const sections = [];
    let num = 1;
    
    const orderPriority = {
        'password': 1,
        'fraud': 2,
        'hacked': 3,
        'about': 4
    };
    
    const sortedSimple = [...simpleSections].sort((a, b) => {
        const priorityA = orderPriority[a.id] || 999;
        const priorityB = orderPriority[b.id] || 999;
        return priorityA - priorityB;
    });
    
    sortedSimple.forEach(section => {
        sections.push({
            num: num++,
            title: section.title,
            type: "simple",
            link: section.url,
            linkText: section.linkText
        });
        console.log(`Добавлен раздел: ${num-1}. ${section.title} → ${section.url}`);
    });
    
    const submenuOrder = ['2fa', 'privacy'];
    for (const key of submenuOrder) {
        if (submenuItems[key] && submenuItems[key].platforms.length > 0) {
            sections.push({
                num: num++,
                title: submenuItems[key].title,
                type: "submenu",
                platforms: submenuItems[key].platforms
            });
            console.log(`Добавлено подменю: ${num-1}. ${submenuItems[key].title} (${submenuItems[key].platforms.length} платформ)`);
        }
    }
    
    for (const key in submenuItems) {
        if (key !== '2fa' && key !== 'privacy' && submenuItems[key].platforms.length > 0) {
            sections.push({
                num: num++,
                title: submenuItems[key].title,
                type: "submenu",
                platforms: submenuItems[key].platforms
            });
            console.log(`Добавлено подменю: ${num-1}. ${submenuItems[key].title} (${submenuItems[key].platforms.length} платформ)`);
        }
    }
    
    const output = { sections };
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
}

generate();
