const vo = require('vo');
const Nightmare = require('nightmare');
require('nightmare-download-manager')(Nightmare);
const nightmare = Nightmare({ show: false });
const fs = require('fs');

const login = 'SEULOGINACADEMUS';
const senha = 'SUASENHAPESSOAL';

nightmare.on('download', (state, downloadItem) => {
  if(state == 'started')
    nightmare.emit('download', `./${Date.now()}-${downloadItem.filename}`, downloadItem);
});

const pegaBoleto = function * () {
  let bannerAtivo;
  let boletosPendentes;

  console.log('Acessando o painel financeiro');
  yield nightmare
    .goto('http://financeiro.devrybrasil.com.br/')
    .wait()
    .type('input.form-control[type="text"]', login)
    .type('input.form-control[type="password"]', senha)
    .click('input[type="submit"]')
    .wait(2000)
    .path()
    .then(path => bannerAtivo = (path == '/Banner.aspx' ? true : false));

  if(bannerAtivo){
    console.log('Banner promocinal detectado \nAcessando a tela do fincaneiro');
    yield nightmare.click('input[type="submit"]').wait(2000);
  }

  console.log('Verificando boletos pendendentes');
  yield nightmare
    .evaluate(() => {
      const boletos = document.querySelectorAll('table tr:not(:first-child)');
      if(boletos.lenght === 0) return false;

      let boletosReturn = [];

      boletos.forEach(boleto => {
        const validade = boleto.querySelector('td:nth-child(4)').innerText;
        const valor = boleto.querySelector('td:nth-child(5)').innerText;
        const descricao = boleto.querySelector('td:nth-child(9)').innerText;
        const botaoDownload = boleto.querySelector('td:last-child input[title="Boleto Bancario"]');

        boletosReturn.push({
          validade: validade,
          valor: valor,
          descricao: descricao
        });
      });

      return boletosReturn;
    })
    .then(boletos => {
      if(!boletos) return console.log('Excelente, tudo pago');
      boletosPendentes = boletos;
      return console.log('Processando boletos pendentes');
    });

    if(boletosPendentes) {
      for (var i = 0; i < boletosPendentes.length; i++) {
        yield nightmare
          .downloadManager()
          .goto('http://financeiro.devrybrasil.com.br/Views/Home/Default.aspx')
          .evaluate(i => {
            const boleto = document.querySelectorAll('table tr:not(:first-child)')[i];
            return boleto.querySelector('td:last-child input[title="Boleto Bancario"]').click();
          }, i)
          .waitDownloadsComplete()
          .then(() => console.log(`Boleto ${++i} baixado com sucesso.`));
      }
    }

    yield nightmare.end();


};

vo(pegaBoleto)((err, suc) => {
  if(err) return console.error('Errooou', err);
  console.log('Programa finalizado.');
});
