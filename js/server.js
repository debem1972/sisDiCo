const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.static('sisDiCo3Victor')); //Pasta onde está o html do projeto
app.post(' /clonar', (req, res) => {
    fs.readFile('sisDiCo3Victor/index3Automatizacao.html', 'utf8', (err, data) => {
        if (err) throw err;
        const gabaritoRegex = /<div class="aula" id="gabarito">([\s\S]*?)<\/div>/;
        const gabaritoMatch = data.match(gabaritoRegex);
        if (gabaritoMatch) {
            const clone = gabaritoMatch[0].replace(' id="gabarito"', '');
            const novoHtml = data.replace(gabaritoRegex, `${clone}\n${gabaritoMatch[0]}`);
            fs.writeFile('sisDiCo3Victor/index3Automatizacao.html', novoHtml, 'utf8', (err) => {
                if (err) throw err;
                res.send('Clone adicionado ao HTML!');
            });
        }
    });
});

app.listen(3000, () => console.log('Servidor rodando na porta 3000'));