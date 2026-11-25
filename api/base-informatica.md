# Base de suporte técnico geral (informática, impressoras, internet e dispositivos)

Versão 3 · 25/11/2026 (impressoras térmicas ampliadas com manuais Elgin i9, Bematech MP-4200 TH, Daruma DR800, Epson TM e Xprinter; internet, Windows, navegador, Android, iPhone, Mac e e-mail ampliados; guia para analisar prints). Conhecimento geral de suporte técnico, que vale para qualquer sistema. Complementa a base do WhatsMenu.
Regra de prioridade: para telas, menus, botões e configurações DO WHATSMENU, vale sempre a base do WhatsMenu (ex.: *Configurações › Gerais › Impressora*, WhatsMenu Desktop). Esta base explica o que acontece FORA do sistema: Windows, navegador, impressora, rede, celular e hardware. Quando juntar as duas, primeiro o que é do WhatsMenu e depois o procedimento geral.
Segurança: nunca pedir a senha do cliente (painel, e-mail, banco, Wi-Fi do roteador, certificado digital). Quando precisar digitar uma senha, o próprio cliente digita.

---

## T0. Como diagnosticar qualquer problema (método do suporte)

**Perguntas que sempre ajudam (coletar antes de mexer):**
1. O que exatamente acontece? Tem mensagem de erro? Pedir um **print** da tela inteira (no Windows: tecla **Windows + Shift + S**, ou **PrtSc**; no celular: botão de volume baixo + liga/desliga).
2. Desde quando? Funcionava antes? O que mudou (atualização, troca de internet, troca de computador, queda de energia, alguém mexeu)?
3. Acontece sempre ou às vezes? Com todos os pedidos/clientes ou só com alguns?
4. Onde acontece: computador, celular, qual navegador, WhatsMenu Desktop ou navegador? Em outro aparelho acontece também?
5. Quem é afetado: só esse usuário ou todos?

**Ordem de verificação (do mais simples ao mais complexo):**
1. **Energia e cabos**: está ligado? cabo encaixado dos dois lados? luz acesa?
2. **Internet**: outros sites abrem? (ex.: abrir google.com.br)
3. **Reiniciar** o que está com problema: fechar e abrir o programa/aba → reiniciar o computador/celular → reiniciar modem/roteador → desligar e ligar a impressora.
4. **Atualizar a página sem cache**: **Ctrl + F5** (Windows) ou **Ctrl + Shift + R**.
5. **Testar em outro lugar**: outro navegador, aba anônima, outro aparelho, outra rede (ex.: 4G do celular). Se em outro lugar funciona, o problema é do aparelho/rede do cliente, não do sistema.
6. Se nada resolver, **escalar** com as informações coletadas (print, horário, aparelho, o que já foi testado), sem fazer o cliente repetir tudo.

**Regra de ouro**: separar "é do sistema" de "é do aparelho/rede do cliente". Se o pedido chega na tela do sistema mas não imprime, o problema é da impressão. Se nem chega, o problema é anterior (internet, loja fechada, configuração do pedido).

**Falar com cliente leigo:** uma instrução por vez, esperar ele confirmar, usar o que ele vê na tela ("o botão verde escrito Salvar no canto de baixo"), evitar sigla técnica, confirmar no final se resolveu.

---

## T1. Impressoras térmicas (58 mm e 80 mm) — conceitos

- **Impressora térmica** não usa tinta nem fita: imprime esquentando um **papel térmico** especial. Se o papel não for térmico, ou estiver ao contrário, sai em branco.
- **Resolução**: quase todas são de **203 dpi (8 pontos por mm)**.
- **Tamanhos de papel (bobina):**
  - **58 mm** (bobina 57 mm, ex.: 57 x 30 m, 57 x 40 m): área útil de cerca de **48 mm** = **384 pontos**, por volta de **32 caracteres por linha** na fonte normal (até 42 na fonte pequena). Comum em impressoras pequenas, portáteis e Bluetooth.
  - **80 mm** (bobina 79/80 mm, ex.: 80 x 40 m): área útil de cerca de **72 mm** = **576 pontos**, por volta de **42 a 48 caracteres por linha** na fonte normal (até 56–64 na fonte pequena, conforme o modelo). Padrão de PDV, balcão e cozinha.
  - Algumas impressoras de 80 mm aceitam bobina de 58 mm com uma **guia/espaçador** e configuração de largura no utilitário.
  - Configurar 80 mm numa impressora de 58 mm **corta o texto na direita**. Configurar 58 mm numa de 80 mm deixa o texto **estreito, com espaço sobrando**. A largura no sistema, no driver e no utilitário da impressora tem que ser a mesma do papel.
- **Linguagem de comandos**: a maioria usa **ESC/POS** (padrão criado pela Epson; Elgin, Daruma, Tanca, Knup, Jetway, Control iD e as genéricas "POS-58/POS-80/XP" são compatíveis). As **Bematech** têm dois modos: **ESC/Bema** e **ESC/POS**; se o sistema manda ESC/POS e a impressora está em ESC/Bema, sai lixo ou não imprime direito → trocar o modo no Software do Usuário Bematech (aba Comandos Adicionais).
- **Guilhotina**: algumas de 80 mm cortam o papel sozinhas (corte total ou parcial). As de 58 mm geralmente não têm guilhotina (rasga na serrilha).
- **Marcas e modelos comuns no Brasil**: Elgin (i7, i8, i9, VOX), Bematech/Elgin Bematech (MP-4200 TH, MP-2800 TH, MP-100S TH), Epson (TM-T20, TM-T20X, TM-T88, TM-m30), Daruma (DR800, DR700), Tanca (TP-450, TP-650), Knup, Jetway, Sweda, Control iD (Print iD), Gertec e as genéricas chinesas "POS-58", "POS-80", "XP-58", "XP-80", "XP-Q200" (Xprinter), "GoldenSky", "Gprinter", "MTP-II/PT-210" (portáteis Bluetooth).
- **Onde ver o modelo**: etiqueta **embaixo ou atrás** da impressora, ou no topo da página do **autoteste**.

### Tipos de conexão
| Conexão | Como identificar | Observação |
|---|---|---|
| **USB** | cabo USB quadrado (tipo B) na impressora e USB normal no computador | a mais comum; precisa de driver no Windows |
| **Serial (RS-232)** | conector de 9 pinos (DB-9) | antiga; precisa da porta COM e da mesma **velocidade (baud rate)** dos dois lados, ex.: 9600, 38400 ou 115200 |
| **Rede (Ethernet/LAN)** | cabo de rede (RJ45) ligado no roteador | imprime pelo **endereço IP** da impressora, geralmente na **porta 9100** |
| **Wi-Fi** | sem cabo, conectada na rede sem fio | também por IP; precisa estar na mesma rede do computador/celular; quase sempre só **2,4 GHz** |
| **Bluetooth** | sem cabo, emparelha com o aparelho | comum nas de 58 mm portáteis; PIN costuma ser **0000** ou **1234** |
| **Gaveta (RJ11/RJ12)** | conector tipo telefone escrito "DK", "DRAWER" ou "CASH" | não é para computador nem para rede: é só para a gaveta de dinheiro |

Atenção: o conector da **gaveta (RJ11/12)** é parecido com o de **rede (RJ45)**, mas é menor. Cabo de rede na porta da gaveta não funciona (e vice-versa).

---

## T2. Impressora — passo a passo para instalar no Windows

1. Ligar a impressora na tomada (com a **fonte original**), ligar o botão (I/O) e colocar papel com o lado térmico virado para a cabeça de impressão. Na maioria, a bobina entra de forma que o papel saia **por baixo do rolo, em direção à frente**. Fechar a tampa até ouvir o **clique**.
2. Conectar o cabo USB **direto no computador** (de preferência na traseira do gabinete; evitar hub, extensão ou cabo muito longo — mais de 3 m dá falha).
3. **Instalar o driver do fabricante** (site oficial da marca, pelo modelo exato). Sem driver, o Windows pode mostrar "Dispositivo desconhecido", "USB Printing Support" ou "POS-80" sem funcionar direito.
   - Instalar o driver **antes** ou **com a impressora ligada**, conforme o instalador pedir.
   - Genéricas sem driver do fabricante costumam funcionar com o driver **"POS-80"/"POS-58" da Xprinter** ou com o **"Generic / Text Only"** do Windows (formatação simples, sem logotipo).
   - Utilitários dos fabricantes (para trocar largura, densidade, modo, IP, codepage, guilhotina): **Elgin** — Software Utilitário (site elgin.com.br/automacao); **Bematech** — Software do Usuário / Bematech User Software; **Epson** — TM Utility e EpsonNet Config; **Daruma** — configuração pelo botão AVANÇO e utilitário Daruma; **Xprinter e genéricas** — "Printer Test"/"POS Printer Tool".
4. Abrir **Configurações › Bluetooth e dispositivos › Impressoras e scanners** (Windows 11) ou **Painel de Controle › Dispositivos e Impressoras** e ver se a impressora aparece **sem aviso** ("offline", "erro", "driver indisponível").
5. Clicar na impressora › **Propriedades da impressora** › aba **Geral** › **Imprimir página de teste**.
6. Aba **Portas**: com USB, a porta marcada deve ser **USB001, USB002…** ("Porta de impressora virtual para USB"). Na serial, **COM1, COM2…**; na rede, a porta **TCP/IP** com o IP dela.
7. Conferir o **tamanho do papel**: **Preferências de impressão** (ou Propriedades › Avançado › Padrões de impressão) › tamanho do tipo **rolo** (ex.: "Roll Paper 80 x 297 mm", "80mm x Receipt", "72mm x 3276mm", "58mm x 3276mm").
8. Depois configurar no sistema (no WhatsMenu: *Configurações › Gerais › Impressora* e, no WhatsMenu Desktop, adicionar a impressora — ver base do WhatsMenu).

**Autoteste (testar a impressora sem computador):** com a impressora **desligada**, **segurar o botão de avanço** (FEED / AVANÇO / "Avança Papel") e ligar; soltar quando começar a imprimir (1 a 5 segundos). Sai uma página com modelo, versão de firmware, configurações (largura, codepage, velocidade da serial, modo de comandos) e, nas de rede, o **endereço IP**.
- Se o autoteste sai perfeito → a impressora está boa; o problema é cabo, porta, driver ou configuração.
- Se o autoteste não sai, sai em branco ou falhado → problema na impressora, na fonte ou no papel.
- Em algumas (Daruma, Bematech) o autoteste abre um **menu**: apertar o AVANÇO 1 vez = autoteste; 2 vezes = modo **hexadecimal (dump)**; 3 vezes = configuração (Daruma). Para sair de qualquer modo especial: **desligar e ligar**.

**Modo hexadecimal / dump**: a impressora imprime **códigos** (números e letras em colunas, tipo "1B 40 0A") em vez do texto. É um modo de teste para técnicos. Se a impressora começou a imprimir só códigos, provavelmente entrou nesse modo: **desligar e ligar** a impressora.

---

## T3. Impressora — guia rápido por sintoma

Antes de tudo, perguntar: **qual marca/modelo**, **qual conexão** (USB, rede, Wi-Fi, Bluetooth), **quais luzes estão acesas/piscando**, **já funcionou antes** e **o que mudou** (trocou computador, roteador, cabo, atualizou o Windows, faltou luz).

| Sintoma | Causas mais prováveis | O que fazer |
|---|---|---|
| Não liga (nenhuma luz) | tomada, fonte, botão desligado, fonte queimada | testar outra tomada; conferir o botão I/O; encaixe da fonte na impressora; testar outra fonte **igual** (mesma voltagem). Se nada → assistência |
| Liga, mas não imprime nada | papel, tampa, fila travada, porta errada, impressora errada no sistema | autoteste → página de teste do Windows → fila → porta (ver T3A e T3B) |
| Sai papel em branco | papel ao contrário, papel não térmico | virar a bobina; teste da unha (lado que escurece é o térmico); trocar o papel |
| Imprime só um pedaço e para | tamanho do papel com altura fixa, fonte fraca, superaquecimento | tamanho de papel tipo rolo; fonte original; esperar esfriar |
| Imprime fraco/apagado | papel ruim/velho, cabeça suja, densidade baixa | trocar papel; limpar cabeça com álcool isopropílico; aumentar densidade no driver/utilitário |
| Faixa branca vertical (falta uma coluna de pontos) | sujeira ou cabeça danificada | limpar a cabeça; se continuar no mesmo lugar → cabeça queimada → assistência |
| Caracteres estranhos, símbolos, "lixo" | driver errado, modo de comandos errado (Bematech ESC/Bema × ESC/POS), baud rate errado (serial), cabo ruim | driver correto do modelo; ajustar modo/codepage/baud no utilitário; trocar cabo |
| Acentos errados (ç, ã, é viram símbolos) | **codepage** diferente | configurar a codepage (ex.: PC850, PC860, WPC1252/ISO8859-1) no utilitário da impressora, igual ao que o sistema usa |
| Sai em chinês ou caracteres orientais | genérica configurada com idioma/codepage chinês | trocar idioma/codepage no utilitário da impressora (Printer Tool); usar o driver correto |
| Sai só números e letras em colunas (códigos) | modo hexadecimal/dump ativado | desligar e ligar a impressora |
| Texto cortado na direita | largura 80 mm configurada numa de 58 mm; escala/margem | largura correta no sistema e no driver; escala menor; margens "nenhuma" |
| Texto muito estreito / sobra espaço | largura 58 mm numa de 80 mm; escala pequena | largura 80 mm; escala 100% |
| Letras gigantes ou minúsculas | escala/zoom da impressão, tamanho de papel errado | ajustar escala, tamanho de papel do driver |
| Sai data, hora e endereço do site no topo/rodapé | impressão pelo navegador com "Cabeçalhos e rodapés" ligado | na janela de impressão do navegador: Mais definições › desmarcar **Cabeçalhos e rodapés** |
| Sai muito papel em branco no fim de cada pedido | tamanho de papel com altura fixa grande (ex.: A4, 80x297), avanço de linhas no fim | usar tamanho de papel "rolo/receipt"; no driver, ajustar fim de documento/avanço; no navegador, margens "nenhuma" |
| Imprime em dobro | 2 cópias configuradas; duas abas/telas do sistema abertas imprimindo; impressora instalada 2 vezes | 1 cópia; deixar só uma aba/tela aberta; remover a impressora duplicada |
| Imprime atrasado (demora minutos) | fila com documentos travados; Wi-Fi/IP instável; computador em economia de energia | limpar fila; IP fixo; desativar suspensão seletiva de USB (T3B) |
| Funciona e depois de um tempo para (precisa reiniciar) | suspensão de USB do Windows, IP mudou (rede), Bluetooth desconecta, superaquecimento | T3B (energia USB); IP fixo (T4); reconectar Bluetooth |
| Logotipo/imagem sai preto, borrado ou cortado | imagem colorida/grande demais | usar logo **preto e branco**, fundo branco, largura máxima ~576 px (80 mm) ou ~384 px (58 mm) |
| QR Code/código de barras não sai ou sai ilegível | impressora antiga sem suporte ao comando, densidade baixa, tamanho pequeno | aumentar densidade; atualizar driver/firmware; imprimir QR como imagem quando o sistema permitir |
| Bipa sem parar | tampa aberta, sem papel, erro | fechar a tampa com firmeza; colocar papel; ver luzes (T3F) |
| Luz de erro acesa/piscando | tampa, papel, guilhotina, temperatura, energia | ver T3F |
| Papel enrosca, sai torto ou amassado | bobina mal colocada, tamanho errado, papel úmido, guilhotina | recolocar; bobina do tamanho certo; tirar pedaços presos |
| Guilhotina não corta / corta pela metade / trava | corte desativado, lâmina travada, papel grosso, densidade muito alta | ativar corte no driver; destravar (T3H); reduzir densidade/velocidade |
| Gaveta não abre | cabo na porta errada, comando de abrir gaveta desligado, gaveta trancada | T3H |
| Desliga ou reinicia ao imprimir | fonte fraca ou de outra voltagem | fonte original da impressora; outra tomada/filtro |
| "Impressora offline" | cabo, porta USB trocada, IP mudou, impressora pausada | T3A/T3B |
| "Driver indisponível" | driver corrompido ou removido por atualização | reinstalar o driver do fabricante |
| Imprime pelo Bloco de Notas mas não pelo sistema | configuração do sistema (impressora escolhida, largura, impressão automática) | conferir a configuração do sistema (base do WhatsMenu) |

**Teste do Bloco de Notas**: abrir o Bloco de Notas, escrever "teste", Arquivo › Imprimir › escolher a impressora térmica. Se imprime, o Windows e a impressora estão ok e o problema é do lado do sistema/navegador.

---

## T3A. Impressora não conecta / não é reconhecida (por tipo de conexão)

### USB
1. Cabo nos dois lados, firme. Testar **outra porta USB** (traseira do gabinete) e **outro cabo** (cabo USB de impressora, A–B). Cabo com mau contato ou muito longo é causa comum.
2. Ao conectar, o Windows faz o som de "dispositivo conectado"? Se não faz → cabo, porta ou placa da impressora.
3. **Gerenciador de Dispositivos** (botão direito no Iniciar › Gerenciador de Dispositivos): procurar em **Filas de impressão**, **Impressoras**, **Controladores USB** ("Suporte para Impressão USB") ou **Outros dispositivos** com **ponto de exclamação amarelo** → falta driver ou driver com erro → reinstalar o driver do fabricante.
4. **Porta USB00x errada**: quando a impressora é ligada em **outra porta USB** do computador, o Windows pode criar uma porta nova (USB002, USB003…) e a impressora continua configurada na antiga. Solução: Propriedades da impressora › aba **Portas** › marcar a outra **USB00x** › Aplicar › **Imprimir página de teste**; repetir até a que funcionar. Dica: deixar sempre a impressora na **mesma porta USB**.
5. Remover e instalar de novo: remover a impressora do Windows, desconectar o USB, reiniciar o computador, instalar o driver e conectar de novo.
6. Algumas impressoras USB aparecem como **porta COM virtual** (USB-Serial). Nesse caso a porta é COM3, COM4… (ver no Gerenciador de Dispositivos › Portas (COM e LPT)).

### Serial (RS-232)
- Porta COM correta (Gerenciador de Dispositivos › Portas). Em computador sem porta serial, usa-se **adaptador USB-serial** (precisa do driver do adaptador; o número da COM pode mudar ao trocar de porta USB).
- **Velocidade (baud rate)**, bits de dados, paridade e controle de fluxo iguais nos dois lados (o autoteste mostra os da impressora; comum: 9600 ou 115200, 8 bits, sem paridade, 1 stop bit).
- Velocidade diferente = caracteres estranhos ou nada.

### Rede (cabo Ethernet)
- Luzes no conector de rede da impressora acesas/piscando? Apagadas = cabo/porta do roteador ruim.
- IP da impressora na **mesma faixa** do computador (ver T4). IP mudou depois de reiniciar o roteador = configurar IP fixo.
- **Conflito de IP**: dois equipamentos com o mesmo IP → um deles para de responder. Trocar o IP da impressora.
- Rede de **visitantes/convidados** ou com "**isolamento de clientes/AP**" no roteador impede o computador de enxergar a impressora → usar a rede principal.
- **VPN** ligada no computador pode impedir acesso a equipamentos da rede local.

### Wi-Fi
- Quase todas só conectam em **2,4 GHz**. Roteador com nome único para 2,4 e 5 GHz pode confundir → criar um nome separado para 2,4 GHz ou conectar por cabo.
- Trocou o **roteador** ou a **senha do Wi-Fi** → a impressora precisa ser configurada de novo (pelo app/página do fabricante ou cabo de rede).
- Senha do Wi-Fi com caracteres especiais pode falhar em algumas impressoras.
- Longe do roteador = cai. Preferir **cabo de rede** para impressora de cozinha/balcão.

### Bluetooth (celular/tablet Android)
1. Impressora ligada e com bateria (portáteis desligam sozinhas depois de alguns minutos sem uso; luz azul piscando = esperando conexão; fixa = conectada, conforme o modelo).
2. Celular: Bluetooth ligado › **Parear novo dispositivo** › escolher a impressora (nomes comuns: "BlueTooth Printer", "MPT-II", "PT-210", "MTP-3", "Printer001" ou o modelo) › PIN **0000** ou **1234**.
3. Permissões do app: **Dispositivos próximos** (Android 12 ou mais novo) e, em Android antigo, **Localização** (o Android exige para procurar Bluetooth). Configurações › Apps › app › Permissões.
4. **Pareada mas não imprime**: no app, escolher a impressora certa; desligar/ligar a impressora; desparear ("Esquecer") e parear de novo; outro celular conectado nela (só aceita um por vez); distância máxima ~10 m sem paredes.
5. Economia de bateria do celular derrubando a conexão → Bateria do app: **Sem restrições**.
6. Para apps que não falam direto com impressora Bluetooth, existe app intermediário de impressão (ex.: **RawBT**) que funciona como serviço de impressão do Android.
7. **iPhone/iPad**: impressoras Bluetooth comuns (Bluetooth clássico) **não aparecem no iOS**. Só funcionam modelos compatíveis com iOS (BLE/MFi) ou impressoras de rede/Wi-Fi com app próprio.
8. Notebook com Bluetooth: parear em Configurações › Bluetooth; a impressora vira uma porta **COM** (ver Mais opções de Bluetooth › Portas COM) para usar no driver.

### USB no celular Android (OTG)
- Algumas impressoras funcionam ligadas no celular/tablet com **cabo/adaptador OTG**; depende do app suportar. O Android pergunta se permite o app acessar o dispositivo USB → **Permitir**.

---

## T3B. Problemas do Windows com impressora térmica

- **Impressora offline**: Configurações › Impressoras › impressora › **Abrir fila de impressão** › menu **Impressora** › desmarcar **"Usar impressora offline"** e **"Pausar impressão"**. Conferir cabo/porta/IP.
- **Fila travada**: na fila › Impressora › **Cancelar todos os documentos**. Se não limpar: **Windows + R** › `services.msc` › **Spooler de Impressão** › botão direito › **Reiniciar** (ou reiniciar o computador). Se continuar: parar o Spooler, apagar os arquivos da pasta `C:\Windows\System32\spool\PRINTERS` e iniciar o Spooler de novo.
- **Para de imprimir depois de um tempo parado (USB)**: o Windows desliga a porta USB para economizar energia.
  - Painel de Controle › **Opções de Energia** › Alterar configurações do plano › Alterar configurações de energia avançadas › **Configurações de USB** › **Configuração de suspensão seletiva de USB: Desabilitado**.
  - Gerenciador de Dispositivos › **Controladores USB** › cada **"Hub USB Raiz"** › Propriedades › **Gerenciamento de Energia** › desmarcar **"O computador pode desligar o dispositivo para economizar energia"**.
  - Plano de energia: computador do caixa não deve entrar em **suspensão** (Configurações › Sistema › Energia › Tela e suspensão › Suspensão: Nunca, quando ligado na tomada).
- **Impressora padrão muda sozinha**: Configurações › Impressoras e scanners › desligar **"Permitir que o Windows gerencie minha impressora padrão"** e definir a térmica (ou a correta) como padrão.
- **Depois de atualização do Windows parou**: reinstalar o driver do fabricante; conferir a porta (USB00x); reiniciar o Spooler.
- **Duas impressoras iguais** aparecem como "POS-80" e "POS-80 (cópia 1)": renomear (Propriedades › Geral › nome, ex.: "COZINHA" e "BALCAO") para não confundir no sistema.
- **Compartilhar impressora** com outro computador: Propriedades › **Compartilhamento** › Compartilhar esta impressora (nome curto, sem espaço). No outro computador: Adicionar impressora › pelo nome `\\NOMEDOCOMPUTADOR\NOMEDAIMPRESSORA`. O computador onde ela está ligada precisa ficar ligado. Para restaurante com vários computadores, impressora **de rede (IP)** é mais estável.
- **Preferências diferentes por usuário**: o tamanho de papel configurado em "Preferências de impressão" vale para o usuário do Windows; em "Avançado › Padrões de impressão" vale para todos.
- **Antivírus bloqueando** o programa que imprime automaticamente → adicionar exceção ao programa (o cliente decide/autoriza).

---

## T3C. Impressão pelo navegador (Chrome/Edge)

- Na janela de impressão (Ctrl + P): **Destino** = a impressora térmica (não "Salvar como PDF"); **Mais definições**:
  - **Tamanho do papel**: o do rolo (80 mm/72 mm ou 58 mm), se aparecer;
  - **Margens: Nenhuma** (ou Mínima);
  - **Escala: Personalizada** (ex.: 100%; diminuir se cortar, aumentar se ficar pequeno);
  - desmarcar **Cabeçalhos e rodapés** (senão sai data, título e endereço do site);
  - marcar **Gráficos de plano de fundo** se o cupom tiver tarjas/linhas que somem.
- O Chrome **lembra** a última impressora e configurações usadas.
- **Impressão sem janela (automática)**: alguns sistemas usam o Chrome em modo de impressão silenciosa (atalho do Chrome com `--kiosk-printing`), que imprime direto na **impressora padrão do Windows**, sem perguntar. Se esse modo estiver em uso e sair na impressora errada → mudar a **impressora padrão** do Windows. (No WhatsMenu, seguir o que a base do WhatsMenu diz sobre WhatsMenu Desktop/impressão automática.)
- Pop-up de impressão bloqueado: permitir pop-ups do site (ícone no fim da barra de endereço).

---

## T3D. Papel (bobina)

- **Teste do papel térmico**: riscar com a unha; o lado que escurece é o térmico. Papel comum não escurece.
- **Bobina colocada ao contrário** é a causa nº 1 de "sai em branco".
- **Tarja colorida (rosa/vermelha) no papel** = **fim da bobina**: trocar.
- Papel térmico **perde a impressão** com calor, sol, álcool, plástico e tempo; guardar em local fresco e seco. Papel muito barato imprime fraco e suja a cabeça.
- Tamanho: bobina de 80 mm não cabe/enrosca numa de 58 mm; bobina de 57 mm numa de 80 mm sem guia sai torta.
- **Diâmetro** da bobina maior que o compartimento (ex.: 80 x 80 m numa impressora que aceita no máx. 83 mm de diâmetro) faz a tampa não fechar → erro de tampa aberta.
- Bobina com o papel solto/frouxo ou úmido enrosca.
- Etiqueta adesiva não é para impressora de cupom (pode colar na cabeça/guilhotina).
- Sensor de **pouco papel** (algumas, como Elgin i9, têm alavanca de ajuste): luz PAPEL acesa/piscando = está acabando.

---

## T3E. Qualidade de impressão e limpeza

- **Limpeza da cabeça térmica**: desligar a impressora, esperar esfriar (alguns minutos; a cabeça esquenta muito), passar **cotonete ou pano macio com álcool isopropílico** na faixa da cabeça (onde o papel encosta), esperar secar e ligar. Não usar objeto duro, lixa ou o dedo (gordura e eletricidade estática danificam). Recomendado mensalmente ou quando a impressão piorar.
- **Rolo de borracha (platen)**: tirar poeira com pano macio ou cotonete; sem solvente.
- **Sensores**: limpar poeira com pincel macio.
- Nunca usar **lubrificante/spray** dentro da impressora.
- **Densidade/escuridão**: aumentar no driver (Preferências) ou no utilitário. Densidade muito alta aquece mais, gasta a cabeça e pode travar a guilhotina.
- **Velocidade**: reduzir no utilitário quando a impressão falha em imagens/QR ou a guilhotina trava.
- Pontos faltando sempre no mesmo lugar depois de limpar → **cabeça com defeito** → assistência técnica.

---

## T3F. Luzes e bipes por marca (o que significa)

**Regra geral (qualquer marca)**: luz **verde/POWER fixa** = ligada e pronta; luz de **papel** = papel acabando/acabou; luz de **erro** acesa ou piscando = tampa aberta, sem papel, guilhotina travada, cabeça superaquecida ou erro de energia. Primeiro: **fechar a tampa com firmeza (clique nos dois lados), colocar papel, esperar esfriar, desligar e ligar**.

**Elgin i9 (e família i7/i8 com painel semelhante)** — LEDs LIGA, ERRO, PAPEL:
- LIGA aceso = ligada; apagado = sem energia (testar outra tomada; se não acender → assistência).
- ERRO piscando = erro; apagado = pronta.
- PAPEL aceso/piscando = papel acabando ou acabou.
- Tampa aberta: bipe e erro → desligar e fechar bem a tampa.
- Sem papel: **3 bipes curtos** com ERRO aceso → colocar bobina.
- Cabeça superaquecida: ERRO piscando com 1 bipe → desligar e esperar **5 minutos**.
- Guilhotina travada: desligar, tirar a tampa frontal e **girar o botão/roda preta** até as lâminas voltarem à posição original.
- Autoteste: segurar AVANÇO (botão amarelo) e ligar. Configurações (densidade, modo hexadecimal etc.) pelo **Software Utilitário Elgin**.

**Bematech MP-4200 TH** — LED "Info" de cor única:
- **Verde fixo** = pronta. **Verde piscando** = pronta, mas papel acabando.
- **Amarelo fixo** = **tampa aberta** → fechar.
- **Amarelo 1 piscada** = **sem papel**. **2 piscadas** = **cabeça superaquecida** (esperar). **3 piscadas** = **erro da guilhotina** (abrir a tampa e tirar papel preso). **4 piscadas** = erro de comunicação/comando inválido (conferir o modo de comandos ESC/Bema × ESC/POS e o driver).
- **Vermelho** = erro não recuperável (memória, mecanismo, tensão baixa da fonte, inicialização da guilhotina) → desligar/ligar; se continuar → assistência Bematech/Elgin.
- Autoteste: segurar "Avança Papel" e ligar (imprime menu e autoteste; 2 toques = modo dump; desligar/ligar para sair).

**Daruma DR800** — LEDs LIGADO (verde) e ERRO (vermelho):
- ERRO aceso = **tampa mal fechada ou sem papel** (fechar apertando os dois lados).
- LIGADO apagado = sem energia (cabo, tomada, botão).
- Menu pelo AVANÇO (segurar e ligar, depois após o bipe: 1 toque autoteste, 2 toques modo hexa, 3 toques modo configuração: guilhotina liga/desliga, corte total/parcial, **codepage** (ISO8859-1, CP850…), **colunas** (48, 52, 34), velocidade da serial).

**Epson TM-T20/TM-T20X/TM-T88** — LEDs POWER, ERROR, PAPER:
- ERROR piscando + tampa aberta = fechar a tampa (volta sozinho).
- ERROR piscando por **temperatura da cabeça** = espera esfriar (volta sozinho).
- **Erro da guilhotina** = tirar o papel/objeto preso, fechar a tampa e desligar/ligar.
- PAPER aceso = papel acabando/acabou.
- Erros que não voltam com desligar/ligar → assistência.
- Modelos de rede: o **botão pequeno na traseira** (perto do conector de rede, apertar com clipe) imprime a **folha de status com o IP**; segurado por alguns segundos durante a inicialização, **restaura as configurações de rede** (IP padrão de fábrica da Epson: **192.168.192.168**).

**Xprinter e genéricas (POS-80, XP-58/80)** — normalmente POWER, ERROR, PAPER:
- ERROR + PAPER = sem papel ou tampa aberta.
- Bipe contínuo = tampa aberta/sem papel/guilhotina.
- Modelos LAN: segurar FEED ao ligar ~5 s imprime o autoteste com IP, máscara e gateway; segurar mais tempo (≈20 s, conforme o modelo) **restaura a rede de fábrica** (depois é preciso configurar de novo com cabo e computador). IP padrão comum: **192.168.123.100**.

---

## T3G. Guilhotina, gaveta e energia

**Guilhotina**
- Não corta: corte desativado no driver ("Cut paper"/"Corte de papel: no fim do documento") ou no sistema; corte parcial deixa uma "pontinha" presa de propósito.
- Travada (luz de erro, faz barulho): desligar, abrir a tampa, tirar o papel preso. Se a tampa não abre porque a lâmina travou: nas que têm, girar a **roda/botão de destravar** (Elgin i9: atrás da tampa frontal) até a lâmina recolher. Não forçar a tampa.
- Corta no meio do pedido: o sistema/driver manda corte por página; usar tamanho de papel tipo rolo e corte só no fim do documento.

**Gaveta de dinheiro**
- O cabo da gaveta vai na porta **DK/DRAWER (RJ11/RJ12) da impressora**, não no computador.
- A gaveta abre por um **comando** enviado à impressora: ativar "abrir gaveta" no driver (Preferências › gaveta/Cash Drawer: "abrir antes/depois de imprimir") ou no sistema.
- Gaveta com chave na posição trancada não abre.
- Abre mas a impressora não imprime (ou vice-versa) → são problemas separados; a gaveta depende da impressora estar funcionando.

**Energia**
- Usar sempre a **fonte original** (impressoras de 80 mm geralmente usam **24 V**; fonte de 12 V ou fraca faz a impressora não ligar, reiniciar ao imprimir ou imprimir fraco).
- Quedas de energia frequentes: nobreak/estabilizador.
- Impressora deve ficar longe de calor (forno, chapa) e gordura/vapor — na cozinha, o vapor e a gordura sujam a cabeça e o sensor e oxidam conectores.

---

## T3H. Perguntas que o suporte deve fazer e quando mandar para assistência técnica

**Roteiro de perguntas (impressora)**
1. Qual marca e modelo? (etiqueta embaixo/atrás)
2. Como ela está ligada: cabo USB no computador, cabo de rede no roteador, Wi-Fi ou Bluetooth no celular?
3. Quais luzes estão acesas ou piscando? Faz bipe?
4. Já imprimiu antes nesse computador/celular? O que mudou?
5. O **autoteste** sai? (segurar o botão de avanço e ligar)
6. A **página de teste do Windows** (ou o Bloco de Notas) imprime?
7. O pedido aparece na tela do sistema? Não imprime nenhum ou só alguns?
8. Pedir **print** da tela de Impressoras do Windows e/ou da configuração de impressora do sistema, e **foto** da impressora (luzes) e de um cupom com defeito.

**Interpretação rápida**
- Autoteste não sai → **impressora/fonte/papel**.
- Autoteste sai, página de teste do Windows não → **cabo, porta, driver, fila** (T3A/T3B).
- Página de teste do Windows sai, sistema não imprime → **configuração do sistema** (impressora escolhida, largura, impressão automática, WhatsMenu Desktop — ver base do WhatsMenu).
- Sai, mas com defeito (cortado, lixo, fraco) → **largura, driver, codepage, densidade, papel** (T3).

**Mandar para assistência técnica (não é configuração)**
- Não liga com outra tomada e fonte certa.
- Luz vermelha de erro não recuperável que volta depois de desligar/ligar.
- Faixa branca vertical que não sai com limpeza (cabeça danificada).
- Guilhotina quebrada, mecanismo travado, barulho de engrenagem.
- Autoteste não sai mesmo com papel certo e tampa fechada.
- Orientar o cliente a procurar a **assistência autorizada da marca** ou a loja onde comprou (garantia). Não abrir a impressora além da tampa do papel.

---

## T4. Impressora de rede (cabo de rede ou Wi-Fi)

1. Descobrir o **IP da impressora**: fazer o **autoteste** (T2); o IP vem impresso (ex.: 192.168.1.87 ou o padrão de fábrica, muitas vezes **192.168.123.100**, **192.168.1.87**, **192.168.0.87** ou **192.168.192.168**, conforme a marca).
2. Ver o IP do computador: **Windows + R** › **cmd** › `ipconfig` › "Endereço IPv4" (ex.: 192.168.0.15).
3. Os **três primeiros números** precisam ser iguais (mesma faixa). Computador 192.168.0.15 e impressora 192.168.1.87 → **não conversam** (faixas diferentes). Ajustar o IP da impressora para a faixa do roteador pelo utilitário do fabricante (ex.: utilitário Elgin, Epson Net Config, "Printer Tool" da Xprinter).
4. Testar se responde: no cmd, `ping 192.168.0.87` (trocar pelo IP dela). Se responde "Resposta de…", está na rede.
5. Instalar no Windows: Adicionar impressora › "A impressora não está na lista" › **Adicionar usando endereço TCP/IP** › digitar o IP › porta **RAW 9100** › escolher o driver.
6. **IP fixo**: se o roteador muda o IP da impressora depois de desligar (DHCP), ela "some". Deixar IP fixo na impressora (fora da faixa automática do roteador) ou reservar o IP no roteador.
- Wi-Fi: muitas impressoras só conectam em rede **2,4 GHz**, não em 5 GHz.

---

## T5. Internet e rede

### T5.1 Sem internet
1. Ver se é **só um aparelho** ou **todos**. Se o celular no mesmo Wi-Fi também não navega → problema no modem/roteador/operadora. Se só o computador → problema do computador (cabo, placa, configuração).
2. **Reiniciar o modem e o roteador**: tirar da tomada, esperar **30 segundos**, ligar e esperar **2 a 3 minutos** até as luzes estabilizarem. Se são dois aparelhos (modem da operadora + roteador), ligar primeiro o modem e depois o roteador.
3. **Luzes do modem/ONU de fibra**: **PON** piscando ou apagada, ou **LOS** vermelha = sem sinal da operadora (fibra rompida, problema na rua) → o cliente liga para o provedor. Luz **Internet** apagada/vermelha = sem autenticação/sem internet do provedor.
4. Cabo de rede: encaixado com clique nos dois lados? Luzinha da porta de rede do computador acende? Testar outro cabo e outra porta do roteador.
5. No computador: ícone de rede com **globo**, **X vermelho** ou **"Sem internet"**. Rodar a solução de problemas: Configurações › Sistema › Solução de problemas › Outras soluções de problemas › Rede e Internet (ou botão direito no ícone de rede › Diagnosticar problemas).
6. **Redefinir a rede do Windows** (último recurso, apaga Wi-Fi salvos e VPNs): Configurações › Rede e Internet › Configurações de rede avançadas › **Redefinição de rede** › Redefinir agora › reiniciar.
7. Para não parar a loja: **roteador do celular** (Ancoragem/Ponto de acesso): Android: Configurações › Rede e Internet › Ponto de acesso e tethering; iPhone: Ajustes › **Acesso Pessoal**.

### T5.2 Wi-Fi
- **Conectado, sem internet**: reiniciar roteador; "esquecer" a rede e conectar de novo; testar outro aparelho; ver se o plano/fatura do provedor está em dia.
- **Senha incorreta** sem ter mudado nada: maiúsculas/minúsculas, teclado com Caps Lock; alguém trocou a senha no roteador; o roteador foi resetado (voltou à senha da etiqueta).
- **Rede não aparece**: rede **5 GHz** em aparelho antigo que só tem 2,4 GHz; rede oculta; Wi-Fi do aparelho desligado (tecla de avião em notebook — tecla com símbolo de avião ou de antena, F2/F12 etc.).
- **2,4 GHz** alcança mais e é mais lento; **5 GHz** é mais rápido, alcança menos e atravessa menos paredes. Impressoras, maquininhas e equipamentos baratos geralmente só usam 2,4 GHz.
- **Sinal fraco/cai**: longe do roteador, paredes, micro-ondas e geladeira atrapalham. Soluções: aproximar, **cabo de rede** no computador do caixa, **repetidor** ou sistema **mesh**, roteador no alto e no centro da loja.
- **Muita gente no Wi-Fi** (clientes da loja, funcionários vendo vídeo): criar **rede de visitantes** separada para clientes.
- **Esquecer rede**: Windows: Configurações › Rede e Internet › Wi-Fi › Gerenciar redes conhecidas › Esquecer. Android: segurar a rede › Esquecer. iPhone: Ajustes › Wi-Fi › (i) › Esquecer Esta Rede.
- **Ver a senha do Wi-Fi salvo**: Android 10+: Wi-Fi › rede › Compartilhar (QR Code mostra a senha). iPhone (iOS 16+): Ajustes › Wi-Fi › (i) › Senha (Face ID). Windows: Configurações › Rede e Internet › Wi-Fi › propriedades da rede › Exibir chave de segurança (Windows 11) — quem vê é o cliente.
- **Endereço privado / MAC aleatório** (iPhone/Android): se o roteador filtra por MAC, desativar "Endereço Wi-Fi privado" para aquela rede.

### T5.3 Internet lenta ou instável
- Testar velocidade: **fast.com** ou **speedtest.net** (no computador e no celular, perto do roteador). Para sistema de pedidos, o mais importante é **estabilidade** (não cair) e **latência** baixa, não muita velocidade.
- Comparar no cabo × no Wi-Fi: se no cabo está bom → problema é o Wi-Fi.
- Downloads/atualizações (Windows Update, jogos, backup na nuvem, câmeras de segurança enviando vídeo) consomem a banda.
- Plano com franquia/4G acabou → velocidade reduzida.
- **Ping alto/perda de pacotes**: cmd › `ping -t google.com` por um minuto (Ctrl+C para parar); "Esgotado o tempo limite" no meio = perda → reclamar com o provedor.

### T5.4 Um site/sistema específico não abre (os outros abrem)
1. Aba anônima e outro navegador.
2. Testar no **4G do celular**: se no 4G abre → bloqueio ou DNS da rede do cliente.
3. Limpar DNS: cmd › `ipconfig /flushdns`.
4. Trocar DNS para **8.8.8.8 / 8.8.4.4** (Google) ou **1.1.1.1 / 1.0.0.1** (Cloudflare): Windows › Configurações › Rede e Internet › (Wi-Fi ou Ethernet) › propriedades › Atribuição de servidor DNS › Editar › Manual › IPv4. Ou no roteador (vale para todos os aparelhos).
5. Antivírus, firewall, **filtro de conteúdo/controle parental** do roteador ou da operadora, **proxy** ou **VPN** bloqueando.
6. **Data e hora erradas** → erro de certificado (ver T6.6).
7. Arquivo **hosts** alterado (raro, malware): `C:\Windows\System32\drivers\etc\hosts`.

### T5.5 Comandos úteis (Windows, no cmd ou PowerShell)
- `ipconfig` → IP do computador ("Endereço IPv4") e do roteador ("Gateway Padrão").
- `ipconfig /all` → detalhes (MAC, DNS, DHCP).
- `ping 8.8.8.8` → testa a internet sem depender de DNS. `ping google.com` → testa internet + DNS. Se o primeiro responde e o segundo não → problema de **DNS**.
- `ipconfig /flushdns` → limpa cache de DNS. `ipconfig /release` e `ipconfig /renew` → pede IP novo ao roteador.
- `tracert google.com` → mostra onde a conexão para.
- `netsh winsock reset` (cmd como administrador) e reiniciar → corrige rede "bagunçada" por programas.
- `nslookup site.com.br` → testa o DNS de um site.

### T5.6 Roteador e modem
- Acesso ao roteador: no navegador, o **Gateway Padrão** (geralmente **192.168.0.1**, **192.168.1.1** ou **192.168.15.1**), com usuário/senha da **etiqueta** do aparelho. Quem mexe é o cliente/provedor; o suporte só orienta.
- **Botão reset** (furinho) apaga tudo: Wi-Fi volta ao nome/senha da etiqueta e a internet pode parar até o provedor configurar de novo. **Não mandar o cliente resetar o roteador** sem necessidade.
- Equipamento do provedor: problemas de sinal, troca de senha e configuração são com o **provedor de internet**.
- **Termos**: **IP** (endereço do aparelho na rede), **roteador** (distribui a internet/Wi-Fi), **modem/ONU** (aparelho da operadora), **DNS** (traduz nome do site em endereço), **DHCP** (roteador dá IP automático), **porta** (canal de comunicação, ex.: 9100 da impressora), **latência/ping** (tempo de resposta), **banda** (velocidade contratada), **SSID** (nome do Wi-Fi), **MAC** (identificação física da placa de rede).

---

## T6. Windows (10 e 11)

### T6.1 Informações do computador
- **Versão do Windows**: Windows + R › `winver`.
- **Configuração (processador, memória, 32/64 bits, nome do computador)**: Configurações › Sistema › **Sobre** (ou Windows + Pause/Break). Windows 32 bits não roda muitos programas atuais.
- **Espaço em disco**: Explorador de Arquivos (Windows + E) › Este Computador.
- **Windows 10 sem suporte**: a Microsoft encerrou o suporte do Windows 10 em **14/10/2025** (só segue recebendo atualizações quem aderiu ao programa pago/estendido). Ainda funciona, mas sem atualizações de segurança; navegadores e programas vão deixando de suportar com o tempo. Windows 7/8 já não são suportados pela maioria dos programas e navegadores atuais.
- **Requisitos do Windows 11**: TPM 2.0, processador relativamente recente, 4 GB RAM e 64 GB de disco (no mínimo; para uso confortável, 8 GB RAM e SSD).

### T6.2 Atalhos e ferramentas
- Ctrl+C / Ctrl+V / Ctrl+X (copiar/colar/recortar), Ctrl+Z (desfazer), Ctrl+A (selecionar tudo), Ctrl+F (procurar na página).
- Alt+Tab (trocar janela), Windows+D (área de trabalho), Windows+E (Explorador), Windows+L (bloquear), Windows+I (Configurações), Windows+R (Executar), Windows+X (menu avançado), Windows+V (histórico da área de transferência), Windows+. (emojis), Windows+setas (encaixar janela).
- **Ctrl+Shift+Esc**: Gerenciador de Tarefas. **Ctrl+Alt+Del**: tela de segurança (gerenciador, trocar usuário, sair).
- **Print**: Windows+Shift+S (recorte), PrtSc (tela toda para colar), Windows+PrtSc (salva em Imagens › Capturas de tela). **Gravar a tela**: Windows+Alt+R (Xbox Game Bar) ou Ferramenta de Captura (Windows 11) › vídeo.
- Ferramentas pelo Windows+R: `devmgmt.msc` (Gerenciador de Dispositivos), `services.msc` (Serviços), `control` (Painel de Controle), `appwiz.cpl` (Programas e Recursos/desinstalar), `ncpa.cpl` (Conexões de rede), `printui /s` (servidor de impressão), `msconfig`, `cleanmgr` (Limpeza de Disco), `%temp%` (temporários), `eventvwr` (Visualizador de Eventos), `mmsys.cpl` (Som), `powercfg.cpl` (Opções de energia), `cmd`.

### T6.3 Travamentos e lentidão
- **Programa "Não está respondendo"**: esperar; se não voltar, Ctrl+Shift+Esc › selecionar › **Finalizar tarefa** › abrir de novo.
- **Tela congelada inteira**: Ctrl+Alt+Del; se nada responde, **Windows+Ctrl+Shift+B** reinicia o driver de vídeo; último caso: segurar o botão liga/desliga por 10 segundos (pode perder o que não foi salvo).
- **Computador lento**:
  1. **Reiniciar** de verdade (Iniciar › Energia › **Reiniciar**; o "Desligar" com inicialização rápida não limpa a memória).
  2. Gerenciador de Tarefas › **Processos**: ver quem usa **CPU**, **Memória** ou **Disco** em 100%.
  3. Muitas abas do navegador = muita memória.
  4. Aba **Aplicativos de inicialização**: desabilitar o que não precisa abrir com o Windows.
  5. Disco quase cheio (menos de 10% livre): Configurações › Sistema › **Armazenamento** › Arquivos temporários; ativar **Sensor de Armazenamento**; esvaziar Lixeira e Downloads; `cleanmgr`.
  6. **HD mecânico + 4 GB RAM** fica lento no Windows 10/11 → recomendar **SSD** e **8 GB**.
  7. Windows Update/antivírus rodando em segundo plano (disco em 100% por um tempo, depois normaliza).
  8. Vírus/adware: Segurança do Windows › Proteção contra vírus e ameaças › **Verificação rápida** (ou completa).
  9. Superaquecimento (notebook quente, ventoinha alta): poeira, base tampada → limpeza com técnico.
- **Tela azul (BSOD)** com carinha triste e código (ex.: `CRITICAL_PROCESS_DIED`, `IRQL_NOT_LESS_OR_EQUAL`, `MEMORY_MANAGEMENT`, `INACCESSIBLE_BOOT_DEVICE`): anotar/fotografar o **código**. Se foi uma vez, reiniciar e observar. Se repete: driver novo/atualização recente (desfazer), memória RAM, disco com defeito → técnico. Não é problema do sistema web.
- **Reiniciando sozinho**: Windows Update, superaquecimento, fonte, tela azul com reinício automático.

### T6.4 Windows Update
- Atualizações podem **reiniciar o computador sozinhas** e deixar o caixa parado. Configurar: Configurações › Windows Update › Opções avançadas › **Horário ativo** (horário de funcionamento da loja); ou **Pausar atualizações** por uma semana em dia de movimento.
- "**Atualizando… não desligue o computador**": **não desligar**; esperar (pode levar bastante tempo). Desligar no meio pode corromper o Windows.
- Algo parou depois de uma atualização: reiniciar de novo; reinstalar driver (impressora, vídeo, som); em último caso, Configurações › Windows Update › Histórico › **Desinstalar atualizações**.
- Atualização travada/erro (códigos tipo 0x800f…, 0x8024…): rodar Configurações › Sistema › Solução de problemas › Windows Update; espaço em disco livre; reiniciar.

### T6.5 Programas: instalar, desinstalar, bloqueios
- **Baixar só de site oficial**. Arquivos: **.exe/.msi** (instaladores Windows), **.zip** (compactado: botão direito › **Extrair tudo** antes de usar), **.apk** (Android — não abre no Windows), **.dmg/.pkg** (Mac).
- **"O Windows protegeu o computador" (SmartScreen)**: se o instalador é oficial e confiável → **Mais informações** › **Executar assim mesmo**.
- **Controle de Conta de Usuário** ("Deseja permitir que este aplicativo faça alterações?") → **Sim**. Se pedir **senha de administrador**, quem sabe é o cliente/TI dele (usuário comum não instala programas).
- **Windows no modo S** (comum em notebooks baratos): só instala apps da Microsoft Store. Sair do modo S: Microsoft Store › procurar "Sair do modo S" (é gratuito e definitivo; o cliente decide).
- **Antivírus** (Avast, AVG, McAfee, Norton, Kaspersky, ESET, Windows Defender) pode **bloquear, colocar em quarentena ou apagar** instaladores e programas que imprimem/abrem portas → restaurar da quarentena e adicionar **exceção**; ou desativar temporariamente só para instalar (o cliente decide). McAfee/Norton de fábrica em notebooks novos são causas frequentes de bloqueio.
- **Desinstalar**: Configurações › Aplicativos › Aplicativos instalados › ⋯ › Desinstalar (ou `appwiz.cpl`).
- **Programa não abre**: reiniciar; executar como administrador (botão direito › Executar como administrador); reinstalar; ver antivírus; erro de **".dll ausente"** ou **"VCRUNTIME140.dll"** = falta o **Microsoft Visual C++ Redistributable** (baixar no site da Microsoft) ou reinstalar o programa; erro de **.NET Framework** → instalar a versão pedida (site da Microsoft).
- **Atalho sumiu da área de trabalho**: procurar pelo nome no Iniciar › botão direito › Fixar na barra de tarefas/Iniciar ou Abrir local do arquivo › criar atalho.

### T6.6 Data, hora e idioma
- Data/hora erradas causam: erro de certificado em sites ("Sua conexão não é particular"), notas fiscais rejeitadas, horários de pedidos errados, falha de login.
- Configurações › Hora e idioma › Data e hora › **Definir hora automaticamente** e **fuso horário automaticamente** ligados (ou fuso **(UTC-03:00) Brasília**) › **Sincronizar agora**.
- Hora volta errada toda vez que liga: **pilha da placa-mãe** (CR2032) fraca → técnico.
- **Teclado com letras trocadas** (ç não existe, acentos errados, @ em outro lugar): layout do teclado errado. Configurações › Hora e idioma › Idioma e região › Português (Brasil) › Opções › Teclados › **Português (Brasil ABNT2)**; remover "Estados Unidos (Internacional)" se não usar. Alternar layout: **Windows + Espaço**. Ícone "POR/PTB" na barra mostra o layout atual.
- **Teclado numérico não digita números**: tecla **Num Lock**.
- **Tudo em maiúsculas**: Caps Lock.

### T6.7 Tela, vídeo e monitor
- Ícones/letras muito grandes ou pequenos: Configurações › Sistema › Tela › **Escala** (100%, 125%, 150%) e **Resolução** "(Recomendado)".
- Tela de cabeça para baixo/de lado: Configurações › Sistema › Tela › **Orientação: Paisagem** (atalho antigo em alguns computadores: Ctrl+Alt+seta para cima).
- **Dois monitores**: Windows + P (Duplicar, Estender, Somente segunda tela). Monitor "sem sinal": cabo HDMI/VGA, entrada do monitor (botão Source/Input), ligar o cabo na placa de vídeo (se houver) e não na placa-mãe.
- Tela piscando/cores estranhas: cabo, driver de vídeo (atualizar pelo site do fabricante ou Windows Update).
- **Brilho**: teclas Fn no notebook; Configurações › Tela.
- **Tela touch** (PDV touch/notebook): toque desalinhado → Painel de Controle › **Configurações do Tablet PC** › **Calibrar**; toque não funciona → Gerenciador de Dispositivos › Dispositivos de Interface Humana › "Tela sensível ao toque compatível com HID" (habilitar/reinstalar).

### T6.8 Som e microfone
1. Volume no ícone do alto-falante (não está mudo?); caixa de som ligada, com volume e no cabo certo (verde = saída de som).
2. **Saída correta**: clicar no alto-falante › ">" ao lado do volume › escolher o dispositivo (caixa de som, fone, monitor HDMI, TV).
3. **Mixer de volume** (Configurações › Sistema › Som › Mixer de volume): o navegador/programa não pode estar no zero.
4. Bluetooth conectado (fone) "puxa" o som para ele → desconectar.
5. **Microfone** (chamadas): Configurações › Privacidade e segurança › **Microfone** › permitir acesso e permitir apps da área de trabalho; escolher o microfone certo em Sistema › Som › Entrada.
6. **Câmera**: Configurações › Privacidade › Câmera › permitir; notebook com **tampa/botão de privacidade** ou tecla Fn de câmera.
7. No navegador, ver T7 (som e microfone do site).

### T6.9 Contas, senhas e acesso
- **Esqueceu a senha do Windows**: conta Microsoft (e-mail) → redefinir em account.live.com/password/reset ou na própria tela de login ("Esqueci minha senha"). Conta local → perguntas de segurança ou outro administrador. É o próprio cliente/TI que resolve; o suporte não tenta burlar.
- **PIN do Windows** ≠ senha da conta Microsoft.
- **Trocar de usuário** do Windows muda impressoras/preferências/navegador salvos (cada usuário tem os seus).
- **Bloqueio de tela** muito rápido no caixa: Configurações › Contas › Opções de entrada › "Se você estiver ausente…"; Sistema › Energia › tela e suspensão.

### T6.10 Arquivos, OneDrive e backup
- Arquivos baixados ficam em **Downloads**. Prints em **Imagens › Capturas de tela**.
- **OneDrive** pode mover Área de Trabalho/Documentos para a nuvem; arquivos com **nuvem azul** só abrem com internet. "OneDrive cheio" (5 GB grátis) gera avisos e para de sincronizar.
- **Extensões de arquivo escondidas**: Explorador › Exibir › Mostrar › **Extensões de nomes de arquivos** (para ver se é .pdf, .exe, .jpg).
- Abrir PDF: navegador (Edge/Chrome) abre direto.
- **Pendrive não aparece**: outra porta USB; Gerenciamento de Disco (Windows+X › Gerenciamento de Disco); pendrive com vírus de atalho → antivírus.

### T6.11 Energia e desligamento
- **Suspensão/hibernação** desconecta USB, impressora, Wi-Fi e pode pausar o sistema: no computador do caixa, Configurações › Sistema › Energia › Tela e suspensão › **Suspensão: Nunca** (na tomada).
- **Notebook fechado** suspende: Painel de Controle › Opções de energia › "Escolher a função do fechamento da tampa" › Não fazer nada (na tomada).
- **Desligar/reiniciar** pelo menu Iniciar › Energia; não tirar da tomada com o Windows ligado.

### T6.12 Mensagens comuns e o que significam
- "**Não é possível acessar este site**" → internet/DNS (T5).
- "**Driver indisponível**" (impressora) → reinstalar driver.
- "**Dispositivo USB não reconhecido**" → outra porta/cabo; reiniciar; driver.
- "**Você não tem permissão**" / "**Acesso negado**" → executar como administrador ou pedir ao administrador do computador.
- "**Ativar o Windows**" (marca d'água no canto) → Windows não ativado; funciona, mas com limitações de personalização; é questão de licença do cliente.
- "**O Windows não pode verificar o editor**" → igual SmartScreen: só seguir se o arquivo for oficial.
- "**Pouco espaço em disco**" → limpar (T6.3).
- "**Sua organização gerencia algumas configurações**" → computador com políticas de empresa/TI; algumas coisas só a TI altera.

---

## T7. Navegador (Chrome, Edge, Firefox, Safari, Opera)

### T7.1 Página não carrega, fica em branco, botão não funciona, dados desatualizados
1. **Ctrl + F5** (recarregar sem cache) ou Ctrl + Shift + R. No Mac: Cmd + Shift + R.
2. **Aba anônima** (Ctrl + Shift + N no Chrome/Edge; Ctrl + Shift + P no Firefox; Safari: Arquivo › Nova Janela Privada). Se funciona na anônima → cache, cookie ou **extensão**.
3. **Limpar cache e cookies**: **Ctrl + Shift + Delete** › Período **"Todo o período"** › marcar **Cookies** e **Imagens e arquivos em cache** › Limpar. Para limpar só de um site (sem deslogar de todos): cadeado/ícone à esquerda do endereço › **Configurações do site** › **Excluir dados**.
4. Desativar **extensões** (bloqueador de anúncios, tradutor, cupom/cashback, antivírus no navegador): Chrome ⋮ › Extensões › Gerenciar extensões.
5. **Atualizar o navegador**: Chrome ⋮ › Ajuda › Sobre o Google Chrome (atualiza e pede para reiniciar). Edge: ⋯ › Ajuda e comentários › Sobre o Microsoft Edge.
6. Testar outro navegador (Chrome × Edge). O **Internet Explorer** não serve mais para sistemas atuais.
7. **Redefinir o navegador** (último recurso): Chrome › Configurações › Redefinir configurações › Restaurar configurações para os padrões originais (não apaga favoritos e senhas).
8. **Aceleração de hardware** causando tela preta/piscando: Configurações › Sistema › desativar "Usar aceleração de hardware" › reiniciar o navegador.

### T7.2 Aparência e uso
- **Zoom**: Ctrl + 0 volta a 100%; Ctrl + "+" / "−". (Mac: Cmd.)
- **Tela cheia**: F11 (sair: F11 de novo).
- **Página traduzida sozinha** (botões com nomes estranhos): desligar a tradução para o site (ícone de tradução na barra de endereço › "Nunca traduzir este site").
- **Reabrir aba fechada**: Ctrl + Shift + T.
- **Barra de favoritos**: Ctrl + Shift + B; favoritar: Ctrl + D.
- **Criar atalho do site na área de trabalho**: Chrome ⋮ › Transmitir, salvar e compartilhar › **Criar atalho** (marcar "Abrir como janela"); Edge ⋯ › Aplicativos › Instalar este site como aplicativo.
- **Perfis**: cada perfil do Chrome tem logins, extensões e configurações próprias; o cliente pode estar em outro perfil (foto no canto superior direito).

### T7.3 Notificações, som, microfone e câmera do site
- Ícone de **cadeado/ajustes** à esquerda do endereço › **Configurações do site** › **Notificações: Permitir**, **Som: Permitir**, **Microfone/Câmera: Permitir**, **Pop-ups: Permitir** (se o site precisa).
- O navegador **bloqueia som automático** até a pessoa interagir com a página; depois de abrir o sistema, **clicar uma vez** na tela.
- **Aba em segundo plano dormindo** (Economia de memória): Chrome › Configurações › **Desempenho** › Economia de memória › "Sempre manter estes sites ativos" › adicionar o site. Edge: Configurações › Sistema e desempenho › **Guias em suspensão** › adicionar exceção.
- Notificações do Windows desativadas: Configurações › Sistema › **Notificações** (ligar para o navegador); **Não incomodar** desligado.
- Notificação bloqueada sem querer: Configurações do site › Notificações › Redefinir/Permitir; ou Chrome › Configurações › Privacidade e segurança › Configurações do site › Notificações.

### T7.4 Login, senhas e cookies
- **Desloga sozinho**: limpeza automática de cookies ao fechar (navegador ou antivírus/"limpadores" como CCleaner), aba anônima, várias contas no mesmo navegador, bloqueio de cookies de terceiros (alguns logins precisam).
- **Senha salva errada** preenchendo automaticamente: Chrome › **Gerenciador de senhas** › editar/excluir (quem mexe é o cliente).
- **"Muitas tentativas"**: esperar alguns minutos antes de tentar de novo; usar "Esqueci minha senha".

### T7.5 Downloads
- Arquivo baixado: Ctrl + J (lista de downloads) › Mostrar na pasta.
- **"Download bloqueado / arquivo perigoso / incomum"**: o navegador desconfia de .exe/.apk. Se o arquivo é **oficial**, clicar na seta/⋯ do download › **Manter** › Manter mesmo assim.
- Download não termina: internet, antivírus, espaço em disco.

### T7.6 Mensagens de erro
- **"Sua conexão não é particular" / NET::ERR_CERT_DATE_INVALID / ERR_CERT_AUTHORITY_INVALID**: data/hora erradas, antivírus inspecionando HTTPS, Wi-Fi público com página de login, rede com filtro.
- **ERR_INTERNET_DISCONNECTED**: sem internet.
- **ERR_NAME_NOT_RESOLVED / DNS_PROBE_FINISHED_NXDOMAIN**: DNS ou endereço digitado errado.
- **ERR_CONNECTION_TIMED_OUT / ERR_CONNECTION_REFUSED / ERR_CONNECTION_RESET**: rede lenta, firewall/antivírus, proxy/VPN ou servidor fora.
- **ERR_TOO_MANY_REDIRECTS**: cookies corrompidos → limpar cookies do site.
- **ERR_CACHE_MISS**: recarregar a página.
- **Erro 400** (requisição inválida, às vezes cookie grande → limpar cookies); **401/403** (sem permissão/sessão expirada → sair e entrar); **404** (página não existe/link errado); **429** (muitas requisições → esperar); **500/502/503/504** (problema no **servidor** — lado do sistema; se vários clientes reclamam ao mesmo tempo → instabilidade, escalar).
- **"Aw, Snap!"/"Ah, não!"** (Chrome) ou **"Esta página está com problema"**: falta de memória/extensão → recarregar, fechar abas, desativar extensões.
- **Página muito lenta**: muitas abas, extensões, computador fraco, internet.

---

## T8. Android (celular e tablet)

### T8.1 Informações e básico
- **Versão do Android**: Configurações › Sobre o telefone › Versão do Android (ou "Informações do software"). Marca/modelo também aparecem ali.
- Os menus mudam conforme a marca (Samsung, Motorola, Xiaomi/Redmi/Poco, Realme, LG, Asus), mas o caminho costuma ser parecido. Na dúvida, usar a **lupa de busca** dentro de Configurações (ex.: "notificações", "bateria", "fontes desconhecidas").
- **Print**: volume baixo + liga/desliga juntos. **Gravar tela**: painel rápido (puxar a barra de cima) › Gravador de tela.
- **Reiniciar**: segurar liga/desliga (em Samsung novos: liga/desliga + volume baixo, ou puxar o painel › ícone de energia) › Reiniciar.

### T8.2 Instalar e atualizar apps
- **Play Store**: procurar o app › Instalar. **Atualizar**: Play Store › foto do perfil › **Gerenciar apps e dispositivo** › Atualizações disponíveis.
- **Instalar APK** (fora da Play Store): baixar › abrir o arquivo › **"Por segurança, seu telefone não pode instalar apps desconhecidos desta fonte"** › Configurações › **Permitir desta fonte** › voltar › **Instalar**. O **Play Protect** pode avisar "app não verificado" → se o APK é o oficial, Mais detalhes › Instalar mesmo assim.
- **"App não instalado"**: versão anterior instalada com assinatura diferente (desinstalar a antiga primeiro), download incompleto (baixar de novo), pouco espaço, Android antigo demais para o app, APK de outra arquitetura.
- **"Espaço insuficiente"**: Configurações › Armazenamento › limpar fotos/vídeos do WhatsApp, apps que não usa, cache.
- **App fecha sozinho / trava**: Configurações › Apps › app › **Forçar parada** › abrir de novo; **Limpar cache**; atualizar; reiniciar o celular; em último caso **Limpar dados** (apaga login e configurações do app) ou reinstalar.
- **Atualizar o Android**: Configurações › Sistema › Atualização do sistema (ou "Atualização de software"). Celular muito antigo para de receber atualizações; alguns apps exigem versão mínima.

### T8.3 Notificações e app em segundo plano (muito importante para pedidos)
- Configurações › Apps › app › **Notificações**: permitidas, com som; canais/categorias de notificação ligados; "Mostrar como pop-up".
- **Bateria/otimização**: Configurações › Apps › app › Bateria › **Sem restrições** (ou "Não otimizar"). Em Samsung: Bateria › Limites de uso em segundo plano › tirar o app de "Apps em suspensão/em suspensão profunda" e colocar em **"Apps nunca em suspensão"**. Em Xiaomi: Configurações › Apps › app › **Economia de bateria: Sem restrições** e **Início automático: ligado**; travar o app nos recentes (segurar o card › cadeado). Em Motorola/Asus/Realme: semelhante (Otimização de bateria › Não otimizar).
- **Modo economia de energia** do celular corta apps em segundo plano e internet → desligar no horário da loja.
- **Não perturbe** ligado silencia tudo: puxar o painel rápido e desligar.
- **Volume de notificação** separado do volume de mídia: botão de volume › três pontinhos/configurações › aumentar **Notificação**.
- **Dados em segundo plano** bloqueados (economia de dados): Apps › app › Dados móveis › permitir uso em segundo plano.

### T8.4 Permissões
- Configurações › Apps › app › **Permissões**: Câmera, Microfone, Localização, **Dispositivos próximos** (Bluetooth, Android 12+), Notificações, Arquivos/Fotos.
- Permissão negada "para sempre": só reativando por esse menu.
- **Localização** desligada impede apps de mapa/entrega e, em Android antigo, a busca de Bluetooth.

### T8.5 Internet no Android
- Wi-Fi conectado sem internet → esquecer a rede e conectar de novo; testar dados móveis.
- Dados móveis não funcionam: **Modo avião** desligado? Dados móveis ligados? Chip certo selecionado para dados (celular com 2 chips: Configurações › SIMs/Gerenciador de chip › Dados móveis)? Franquia acabou? **APN** do chip (raro).
- **Redefinir configurações de rede** (apaga Wi-Fi e Bluetooth salvos): Configurações › Sistema › Opções de redefinição › Redefinir Wi-Fi, celular e Bluetooth.
- **DNS particular** configurado errado bloqueia sites: Configurações › Rede › DNS particular › Automático/Desativado.

### T8.6 Problemas comuns
- **Tela não gira**: painel rápido › **Rotação automática**.
- **Letras grandes/pequenas**: Configurações › Tela › Tamanho da fonte / Zoom da tela.
- **Teclado sumiu/corretor atrapalhando senha**: trocar teclado (Gboard/Samsung) e desligar correção automática temporariamente.
- **Celular lento/quente**: reiniciar; fechar apps; liberar espaço (menos de 10% livre deixa lento); tirar capinha se esquentar muito.
- **Bateria acaba rápido**: brilho, apps em segundo plano, sinal fraco; tablet de cozinha/caixa deve ficar **na tomada**.
- **Não carrega**: cabo/carregador, sujeira na entrada USB, tomada.
- **Tablet/celular de pedidos dorme a tela**: Configurações › Tela › **Tempo limite da tela** (aumentar) — e, se preciso, opção de manter a tela ligada carregando (Opções do desenvolvedor › "Permanecer ativo" — avançado).
- **Restaurar de fábrica** apaga tudo; é último recurso e decisão do cliente (precisa saber a conta Google do aparelho, senão bloqueia — proteção FRP).

---

## T8A. iPhone e iPad (iOS / iPadOS)

### T8A.1 Básico
- **Versão do iOS**: Ajustes › Geral › Sobre › Versão do iOS. **Modelo**: Ajustes › Geral › Sobre › Nome do Modelo.
- **Atualizar**: Ajustes › Geral › **Atualização de Software**.
- **Print**: lateral + volume para cima (Face ID) ou lateral/topo + botão Início (com botão). **Gravar tela**: Central de Controle › Gravação de Tela (adicionar em Ajustes › Central de Controle).
- **Reiniciar**: segurar lateral + volume › deslizar para desligar › ligar. **Forçar reinício** (travado): volume +, volume −, segurar a lateral até a maçã.
- **Apps só pela App Store** (não instala APK nem .exe). Na União Europeia há exceções, no Brasil não.

### T8A.2 Safari e sites
- Links abertos dentro do Instagram, Facebook, WhatsApp ou e-mail abrem num **navegador embutido** que pode bloquear som, microfone, câmera, downloads e login → tocar em **⋯/compartilhar** › **Abrir no Safari** (ou Abrir no navegador).
- **Limpar dados do Safari**: Ajustes › Apps › Safari (ou Ajustes › Safari em versões antigas) › **Limpar Histórico e Dados de Sites**. Só de um site: Safari › Avançado › Dados de Sites.
- **Pop-ups bloqueados**: Ajustes › Safari › Bloquear Pop-ups (desligar se o site precisa).
- **Câmera/microfone para o site**: ao entrar, tocar em **Permitir**; ou Ajustes › Safari › Câmera/Microfone › Perguntar/Permitir; ou no site: "aA" na barra › Ajustes do Site.
- **Som de chamada no navegador**: aumentar volume pelo botão lateral **durante** a chamada; **chave de silencioso**/Botão de Ação pode cortar sons de páginas; fone Bluetooth conectado puxa o áudio.
- **Adicionar site à Tela de Início** (vira "app"): Safari › compartilhar › **Adicionar à Tela de Início**. A partir do iOS 16.4, sites adicionados assim podem mandar **notificações** (se o site suportar e o usuário permitir).
- **Bloqueador de conteúdo** (extensões do Safari) pode quebrar sites: Ajustes › Safari › Extensões.
- **Modo de Bloqueio**/**Tempo de Uso** com restrição de sites pode bloquear páginas: Ajustes › Tempo de Uso › Conteúdo e Privacidade.

### T8A.3 Notificações e som
- Ajustes › Notificações › app › **Permitir Notificações**, Sons, Alertas na Tela Bloqueada/Banners.
- **Foco/Não Perturbe** ativo (lua na barra) silencia tudo: Central de Controle › Foco › desligar.
- **Resumo Programado** atrasa notificações: Ajustes › Notificações › Resumo Programado.
- Chave lateral no silencioso: notificações só vibram.
- **Atualização em 2º plano** desligada impede alguns apps de atualizar: Ajustes › Geral › Atualização em 2º Plano.
- **Modo de Pouca Energia** (bateria amarela) reduz atividade em segundo plano → desligar em Ajustes › Bateria.

### T8A.4 Internet e conexões
- Wi-Fi: Ajustes › Wi-Fi › (i) › Esquecer Esta Rede; "**Endereço Wi-Fi Privado**" pode atrapalhar redes com filtro de MAC; "**Ocultar Endereço IP**"/Relay Privado do iCloud pode atrapalhar alguns sites/redes.
- Dados móveis: Ajustes › Celular › Dados Celulares ligado; app com dados celulares permitidos (lista em Ajustes › Celular).
- **Redefinir Ajustes de Rede** (apaga Wi-Fi salvos): Ajustes › Geral › Transferir ou Redefinir › Redefinir › Redefinir Ajustes de Rede.
- **Bluetooth**: impressoras Bluetooth comuns (clássico) não aparecem no iPhone; só acessórios compatíveis (BLE/MFi).

### T8A.5 Problemas comuns
- **Armazenamento cheio**: Ajustes › Geral › Armazenamento do iPhone (fotos e WhatsApp ocupam muito).
- **App travando**: fechar (deslizar de baixo para cima e jogar o app para cima) e abrir; atualizar; reinstalar (apagar app pode apagar dados locais).
- **Esqueceu senha do ID Apple**: iforgot.apple.com (o próprio cliente).
- **Conta/código de verificação**: código de 6 dígitos chega em outro aparelho Apple ou SMS; o suporte nunca pede esse código.

---

## T8B. Mac (macOS) — o básico

- **Versão**: menu  › Sobre Este Mac.
- **Atalhos**: Cmd em vez de Ctrl (Cmd+C/V, Cmd+Q fecha o app, Cmd+Tab troca de app, **Cmd+Option+Esc** = Forçar Encerrar). Print: **Cmd+Shift+4** (área) ou **Cmd+Shift+5** (opções/gravar tela).
- **Recarregar sem cache** no Safari/Chrome: Cmd+Shift+R.
- **Instalar app baixado**: abrir o .dmg › arrastar para Aplicativos. "**Não pode ser aberto porque é de um desenvolvedor não identificado**" → Ajustes do Sistema › **Privacidade e Segurança** › "Abrir Mesmo Assim" (só se for oficial).
- **Permissões** (acesso remoto, gravação de tela, câmera, microfone, acessibilidade): Ajustes do Sistema › Privacidade e Segurança › item › ligar o app (pode pedir para reabrir o app).
- **Impressora no Mac**: Ajustes do Sistema › Impressoras e Scanners › "+". Impressoras térmicas precisam de driver para macOS (nem todas têm).
- **Mac não roda programas .exe** (do Windows).

---

## T8C. Chromebook e Linux (quando aparecer)
- **Chromebook**: roda Chrome e apps Android da Play Store; não instala programas .exe do Windows. Impressoras térmicas USB geralmente não têm driver.
- **Linux**: não roda .exe; para sistemas web, usar Chrome/Firefox normalmente. Impressora térmica precisa de driver CUPS do fabricante.

---

## T8D. E-mail (Gmail, Outlook, Hotmail)
- **E-mail não chega**: conferir **Spam/Lixo eletrônico**, abas **Promoções/Atualizações/Social** (Gmail), filtro/regra que arquiva, caixa **cheia** (Gmail compartilha 15 GB com Drive e Fotos), endereço digitado errado (gmail.com × gmial.com, hotmail.com × hotmail.com.br). Esperar alguns minutos e reenviar.
- **Marcar como "Não é spam"** e adicionar o remetente aos contatos para os próximos chegarem na entrada.
- **Esqueceu a senha do e-mail**: recuperação do próprio Google (accounts.google.com/signin/recovery) ou Microsoft (account.live.com); o suporte não acessa o e-mail do cliente.
- **Verificação em duas etapas**: código no celular/app autenticador; sem o celular, usar códigos de backup.

---

## T9. Acesso remoto (AnyDesk, TeamViewer, RustDesk)

- Serve para o suporte ver e controlar o computador do cliente, **com autorização dele**.
- **AnyDesk**: cliente baixa em **anydesk.com** (versão oficial), abre e passa o **número de "Este local de trabalho"** (9 ou 10 dígitos). O suporte digita o número e pede conexão; o cliente clica em **Aceitar**.
- **TeamViewer**: cliente passa **ID e senha temporária** que aparecem na tela do programa (essa senha temporária muda a cada sessão e é para o acesso remoto; não é a senha do cliente).
- **No Mac**: na primeira vez é preciso liberar em Ajustes do Sistema › Privacidade e Segurança › **Gravação de Tela** e **Acessibilidade** para o app; senão o suporte só vê a tela preta ou não consegue clicar.
- Conexão não fecha/tela travada: internet lenta dos dois lados; fechar e abrir o programa.
- **Segurança**: só usar link oficial; nunca deixar acesso não supervisionado sem o cliente saber; avisar o cliente quando terminar e encerrar a sessão. Golpistas usam acesso remoto fingindo ser suporte: o suporte legítimo não pede senha de banco nem código de SMS.

---

## T10. Hardware de PDV e loja

- **Computador touch (tudo-em-um / PDV touch)**: toque desalinhado → calibrar (Painel de Controle › Configurações do Tablet PC › Calibrar, no Windows) ou reinstalar o driver do touch. Tela suja ou com película descolando atrapalha o toque.
- **Leitor de código de barras**: a maioria funciona como **teclado** (modo HID): onde o cursor estiver, ele "digita" o código e dá Enter. Se não lê: cursor no campo certo? Configuração de "Enter no final" (ler o código de configuração do manual do leitor). Leitor que lê mas troca caracteres → layout de teclado (ABNT2 × US).
- **Balança**: conecta por serial/USB e precisa de configuração própria do sistema (protocolo, porta COM, velocidade). Sem integração, o peso é digitado à mão.
- **Teclado/mouse sem fio**: pilha/bateria; receptor USB encaixado.
- **Nobreak**: mantém o computador ligado em quedas rápidas de energia e protege contra picos. Bipando = sem energia da rua ou bateria fraca.
- **Queda de energia**: depois que a luz volta, ligar primeiro o modem/roteador, esperar a internet voltar, e só então abrir o sistema e conferir a impressora.
- **Computador não liga**: tomada/filtro de linha ligado? Botão da fonte atrás (I/O)? Luz no gabinete? Cabo do monitor solto (computador liga mas tela preta)? Se nada acende → técnico.
- **USB não reconhece**: trocar de porta (as traseiras do gabinete são mais confiáveis), trocar cabo, reiniciar, evitar hubs sem energia.

---

## T11. Sistemas online (SaaS) — problemas típicos

- **Não consegue entrar (login)**: e-mail digitado errado (espaço no fim, .com.br × .com), **Caps Lock** ligado, senha trocada por outra pessoa da loja, teclado do celular com corretor colocando letra maiúscula. Usar **"Esqueci minha senha"**: o link chega no e-mail cadastrado (ver também **Spam/Lixo eletrônico** e Promoções no Gmail). O suporte não pede nem digita a senha do cliente.
- **E-mail não chega**: conferir spam/lixo eletrônico, aba Promoções/Atualizações do Gmail, e-mail digitado errado, caixa cheia. Pode demorar alguns minutos.
- **Dados diferentes em dois aparelhos**: um deles está com a página antiga aberta → atualizar (Ctrl+F5) ou sair e entrar.
- **Duas abas/janelas do sistema abertas**: podem imprimir em dobro ou tocar alerta duas vezes; deixar uma só.
- **Versão desatualizada do aplicativo** (desktop/celular): muitos erros somem atualizando o app para a versão mais recente.
- **"Sessão expirada"**: sair e entrar de novo.
- **Lentidão geral**: ver se é só com esse cliente (internet/computador dele) ou com vários ao mesmo tempo (instabilidade do sistema → escalar).
- **Arquivo/imagem não sobe**: tamanho grande demais, formato não aceito (usar JPG/PNG), internet lenta. Diminuir a imagem (ex.: pelo site de compressão de imagens ou tirando print).
- **Horários errados no sistema**: fuso/hora do aparelho (T6) ou configuração de horário da loja no sistema.
- **Link enviado ao cliente não abre**: link cortado ao copiar, aberto dentro de app (Instagram/WhatsApp) em vez do navegador, ou bloqueio de rede.
- **Ao escalar para o time técnico, mandar**: nome da loja, usuário afetado, o que aconteceu, horário aproximado, print/vídeo, aparelho e navegador/app com versão, o que já foi testado.

---

## T12. WhatsApp e WhatsApp Web (geral)

- **WhatsApp Web / Desktop desconectado**: no celular, WhatsApp › ⋮ (ou Configurações no iPhone) › **Dispositivos conectados** › **Conectar um dispositivo** › ler o **QR Code** na tela do computador.
- O celular principal precisa entrar no WhatsApp de vez em quando (se ficar cerca de 14 dias sem uso, os aparelhos conectados desconectam).
- Até 4 aparelhos conectados além do celular.
- **WhatsApp Business × WhatsApp normal**: são apps diferentes; um número só pode estar em um deles por vez no celular.
- Mensagens não chegam: internet do celular, número bloqueado pelo cliente, número digitado sem DDD/código do país (Brasil: 55 + DDD + número).
- **Número banido/restrito**: acontece com envio em massa para quem não salvou o número ou muitas denúncias. Evitar disparos para listas compradas.
- Links de WhatsApp: formato **wa.me/55DDDNUMERO** (sem espaços, traços ou parênteses).

---

## T13. Nota fiscal eletrônica (NFC-e/NF-e) — conceitos gerais

(Os passos dentro do sistema ficam na base do WhatsMenu; aqui são os conceitos para entender o cliente.)
- **NFC-e** (modelo 65): nota do consumidor no varejo/food, impressa como **DANFE NFC-e** na térmica, com QR Code. **NF-e** (modelo 55): nota entre empresas/operações maiores.
- **Certificado digital**: **A1** é um arquivo (.pfx/.p12) com senha, validade de **1 ano**, instalado no computador ou enviado ao sistema; **A3** fica em token USB ou cartão, validade de 1 a 3 anos. Certificado **vencido** = notas rejeitadas. A senha do certificado é do cliente: ele mesmo digita.
- **CSC (Código de Segurança do Contribuinte)** e **ID do CSC (token)**: gerados no site da **SEFAZ** do estado; necessários para emitir NFC-e.
- **Credenciamento/autorização**: alguns estados exigem que a empresa se credencie para NFC-e e autorize o software emissor (CNPJ do fornecedor do sistema) no portal da SEFAZ.
- **Ambiente de homologação × produção**: homologação é teste (nota sem valor fiscal); produção é a valendo.
- **Rejeição**: a SEFAZ devolve um código e um motivo. Ler o motivo exato e conferir: certificado (validade), data/hora do computador, CSC/ID, dados do produto (**NCM**, **CFOP**, **CST/CSOSN**), dados do emitente (inscrição estadual, regime tributário), numeração/série. Dúvidas tributárias (qual NCM, qual CST) são do **contador do cliente**.
- **Contingência**: quando a SEFAZ ou a internet está fora, algumas soluções emitem em contingência offline e transmitem depois.
- **Cancelamento** de NFC-e tem prazo curto definido pela SEFAZ (em geral contado em minutos/horas após a emissão; varia por estado).

---

## T14. Segurança e golpes (orientar o lojista)

- O suporte legítimo **nunca pede senha** do painel, do banco, de e-mail ou **código recebido por SMS/WhatsApp**.
- Golpes comuns: falso suporte pedindo acesso remoto ou pagamento de "taxa"; link falso de boleto/Pix; mensagem "sua conta será bloqueada, clique aqui"; pedido de código de verificação do WhatsApp (clonagem).
- Recomendar: senha forte e diferente para cada sistema, verificação em duas etapas no WhatsApp (Configurações › Conta › Confirmação em duas etapas) e no e-mail, não compartilhar o mesmo login entre todos os funcionários quando o sistema permitir usuários separados.
- Dados de clientes do lojista (nome, telefone, endereço) são dados pessoais protegidos pela **LGPD**: não pedir, não copiar para fora do sistema, não mandar em grupos.

---

## T16. Como analisar um print (imagem) enviado pelo atendente

### T16.1 Método (sempre nesta ordem)
1. **Identificar onde é**: tela do WhatsMenu (painel, PDV, WhatsMenu Desktop, app do celular), janela do Windows, navegador, celular Android, iPhone, WhatsApp, conversa com o cliente, foto de impressora/cupom/equipamento.
2. **Ler o texto exato do erro** (título, mensagem e código: ex. "ERR_NAME_NOT_RESOLVED", "Erro 502", "0x0000011b", "Rejeição 539"). O código é a pista mais importante; repetir o código na resposta.
3. **Olhar os sinais visuais**: ícones (⚠️ amarelo = aviso; ❌/círculo vermelho = erro; globo no ícone de rede = sem internet; cadeado cortado = certificado), botões desabilitados (cinza), campos em vermelho, chave/toggle desligado, luzes da impressora na foto, barra de endereço (qual site, http × https), hora no canto da tela (data/hora errada do computador?), ícone de Wi-Fi/bateria/modo avião no celular.
4. **Dizer em 1 ou 2 linhas o que o print mostra** (ex.: "É a fila de impressão do Windows com 3 documentos com erro na impressora POS-80").
5. **Dar a causa mais provável e o passo a passo**, do mais simples ao mais complexo, usando a base do WhatsMenu (telas do sistema) e esta base (Windows, navegador, celular, impressora, rede).
6. **Se o print não basta**, pedir exatamente o que falta: "manda um print da tela inteira", "do texto do erro aberto", "da tela Impressoras do Windows", "da configuração em Configurações › Gerais › Impressora", "foto da impressora mostrando as luzes".
7. **Não repetir dados pessoais** que aparecerem no print (nome, telefone, endereço, CPF, e-mail, valores, senhas). Se aparecer **senha, token, chave de API ou dados de cartão**, avisar o atendente para apagar o print e não compartilhar.

### T16.2 Print ruim — o que pedir
- **Cortado** (só um pedaço): pedir a tela inteira (no Windows: tecla PrtSc ou Windows+Shift+S › tela inteira).
- **Foto da tela pelo celular, torta/tremida/com reflexo**: dá para usar se o texto estiver legível; se não, pedir o print pelo próprio computador.
- **Texto pequeno demais/ilegível**: pedir print mais de perto ou dar zoom antes (Ctrl + "+").
- **Mensagem em inglês**: traduzir e explicar em português.
- **Print de conversa do cliente sem a tela do problema**: responder sobre o que dá para entender da conversa e sugerir o que pedir ao cliente (print da tela, modelo do aparelho etc.).
- **Não dá para identificar nada com segurança**: dizer claramente o que se vê e o que não dá para afirmar, sem inventar.

### T16.3 Telas do Windows — como reconhecer e o que fazer
- **Fila de impressão** (janela com o nome da impressora, colunas "Nome do documento / Status / Proprietário"): status "**Erro**", "**Erro – Imprimindo**", "**Offline**", "**Pausada**", "**Excluindo**" travado → cancelar todos os documentos, desmarcar "Usar impressora offline"/"Pausar", reiniciar o Spooler (T3B). Título com "**– Offline**" ou "**Usar Impressora Offline**" → cabo/porta/IP.
- **Impressoras e scanners** (Configurações): impressora com "**Offline**", "**Driver indisponível**", "**Erro**" embaixo do nome → T3A/T3B. Duas parecidas ("POS-80" e "POS-80 (cópia 1)") → explicar a duplicada.
- **Propriedades da impressora › aba Portas**: ver qual porta está marcada (USB001, USB002, COM, IP) → T3A (porta USB errada).
- **Gerenciador de Dispositivos**: item com **triângulo amarelo/ponto de exclamação** = driver com problema/faltando; "**Dispositivo desconhecido**" ou em "**Outros dispositivos**" = falta driver; **seta para baixo** no ícone = dispositivo desabilitado (botão direito › Habilitar).
- **"O Windows protegeu o computador"** (janela azul do SmartScreen) → se o arquivo é oficial: Mais informações › Executar assim mesmo.
- **"Deseja permitir que este aplicativo faça alterações no seu dispositivo?"** (Controle de Conta de Usuário) → Sim; se pede senha, é a do administrador do computador (cliente).
- **Segurança do Windows / antivírus** ("Ameaça encontrada", "Arquivo em quarentena", "Avast/AVG/McAfee bloqueou") → o antivírus bloqueou o programa/instalador; restaurar da quarentena e adicionar exceção se for oficial (T6.5).
- **"Não é possível encontrar…", "O sistema não pode encontrar o arquivo especificado"** → atalho quebrado ou programa removido → reinstalar/criar atalho de novo.
- **"VCRUNTIME140.dll/MSVCP140.dll não foi encontrado"** → instalar Microsoft Visual C++ Redistributable (T6.5).
- **Tela azul com carinha ":(" e código** → T6.3 (anotar código; se repete, técnico).
- **"Atualizando… não desligue o computador"/"Trabalhando nas atualizações"** → esperar (T6.4).
- **Ícone de rede na barra com globo ou X** → sem internet (T5). **Ícone de Wi-Fi com ponto de exclamação** → conectado sem internet.
- **Relógio da barra com data/hora errada** → T6.6 (causa erro de certificado e de nota fiscal).
- **Marca d'água "Ativar o Windows"** → licença do Windows; não afeta o sistema web.
- **Erros de impressão com código 0x…**: **0x0000011b**, **0x00000709**, **0x00000bc4** (problemas com impressora compartilhada/padrão após atualização do Windows) → remover e adicionar a impressora de novo; definir a padrão manualmente; para compartilhadas, preferir impressora de rede (IP) ou instalar localmente.
- **Explorador de arquivos com arquivo .zip** → extrair antes de usar (botão direito › Extrair tudo).

### T16.4 Telas do navegador — como reconhecer
- **Página cinza/branca com dinossauro** ou "**Sem internet**" → sem internet (T5).
- **"Não é possível acessar esse site"** + código **ERR_…** → ver lista em T7.6 pelo código.
- **"Sua conexão não é particular"** (cadeado vermelho, NET::ERR_CERT_…) → data/hora do computador, antivírus, rede com filtro (T7.6).
- **"Aw, Snap!"/"Ah, não!" (pasta triste)** → memória/extensão: recarregar, fechar abas.
- **Erro 404/500/502/503/504** em página do sistema → T7.6 (5xx = servidor; ver se é geral).
- **Barra de endereço com ícone de sino/câmera/microfone riscado** → permissão bloqueada para o site (T7.3).
- **Ícone de pop-up bloqueado** no fim da barra de endereço → permitir pop-ups.
- **Barra de download com "arquivo pode ser perigoso"** → T7.5.
- **Janela de impressão do Chrome** (pré-visualização à direita, "Destino", "Mais definições") → conferir destino (impressora certa × "Salvar como PDF"), margens, escala, cabeçalhos e rodapés (T3C).
- **Zoom diferente de 100%** (lupa na barra de endereço) → Ctrl + 0.
- **Página em outro idioma/traduzida** (ícone de tradução) → desligar tradução para o site.

### T16.5 Telas do celular
- **Android "Por segurança, seu telefone não pode instalar apps desconhecidos desta fonte"** → Configurações › Permitir desta fonte (T8.2).
- **Android "App não instalado"** → T8.2.
- **"Bloqueado pelo Play Protect" / "App não seguro"** → se é o APK oficial: Mais detalhes › Instalar mesmo assim.
- **Pedido de permissão ("Permitir que … acesse dispositivos próximos/câmera/microfone/notificações?")** → Permitir (para o app funcionar).
- **Barra de status**: avião ✈️ = modo avião; lua 🌙 = Não perturbe; bateria amarela/laranja = economia de energia; "E" ou "H" ou sem 4G = sinal fraco; Wi-Fi com "!" ou "x" = sem internet.
- **iPhone com página aberta dentro do Instagram/WhatsApp** (barra de cima com "X" e nome do app, sem a barra do Safari) → abrir no Safari (T8A.2).
- **iPhone "Safari não pode abrir a página"** → sem internet/endereço errado.
- **Tela "Nenhum SIM"/"Sem serviço"** → chip/operadora.

### T16.6 Fotos de impressora e cupom
- **Luzes**: identificar a marca/modelo pela foto (logo na tampa) e interpretar as luzes pela tabela de T3F.
- **Cupom em branco** → papel ao contrário/não térmico (T3D).
- **Cupom fraco/falhado/com faixa branca vertical** → T3E (limpeza/cabeça).
- **Cupom com símbolos estranhos/lixo** → driver/modo/codepage (T3).
- **Cupom com códigos em colunas (hexadecimal)** → modo dump: desligar e ligar.
- **Texto cortado na direita** → largura 80 × 58 mm (T1).
- **Cupom com data e endereço do site no topo/rodapé** → cabeçalhos e rodapés do navegador (T3C).
- **Cupom em chinês** → codepage/idioma da impressora genérica.
- **Página de autoteste** → ler modelo, firmware, largura, codepage, baud rate, modo (ESC/POS × ESC/Bema) e IP; usar essas informações na resposta.
- **Cabo na porta errada** (RJ45 de rede na porta da gaveta, ou vice-versa) → T1 (tipos de conexão).

### T16.7 Outros prints comuns
- **AnyDesk/TeamViewer**: número/ID na tela; "**Aguardando imagem**" ou tela preta no Mac → permissões de Gravação de Tela/Acessibilidade (T9).
- **WhatsApp Web com QR Code** → reconectar pelo celular (T12). "**Telefone sem conexão**"/"Computador não conectado" → internet do celular/aparelho principal.
- **Rejeição da SEFAZ (nota fiscal)** com código e motivo → ler o motivo e conferir os itens de T13 (certificado, data/hora, CSC, NCM/CFOP/CST); dúvidas tributárias → contador do cliente.
- **E-mail na caixa de spam** → orientar marcar "Não é spam" (T8D).
- **Modem/roteador com luzes** (foto) → T5.1 (PON/LOS).
- **Print de conversa do cliente reclamando** → identificar o problema relatado, sugerir as perguntas de diagnóstico (T0/T3H) e uma mensagem educada para o atendente mandar.
- **Tela do WhatsMenu** (painel/PDV/Desktop) → usar a base do WhatsMenu para explicar a tela e o caminho exato no menu; nunca inventar botão que não esteja na base.

---

## T15. Glossário de informática

- **Driver**: programa que faz o Windows conversar com um equipamento (impressora, leitor).
- **Spooler / fila de impressão**: lista de documentos esperando para imprimir.
- **Cache**: cópia guardada de páginas/arquivos para abrir mais rápido; às vezes fica desatualizado.
- **Cookie**: informação que o site guarda no navegador (ex.: login).
- **Aba anônima**: janela do navegador sem cache, cookies e extensões.
- **IP / Gateway / DNS / DHCP**: ver T5.
- **Porta COM / serial**: conexão antiga de equipamentos; **baud rate** = velocidade dela.
- **ESC/POS**: linguagem de comandos das impressoras térmicas.
- **Firmware**: programa interno do equipamento.
- **SSD × HD**: tipos de armazenamento; SSD é muito mais rápido.
- **RAM / memória**: memória de trabalho; pouca RAM deixa o computador lento com muitas abas.
- **APK / EXE**: instaladores de Android / Windows.
- **QR Code**: código quadrado lido pela câmera (ex.: conectar WhatsApp Web, NFC-e).
- **HID**: equipamento que funciona como teclado (ex.: leitor de código de barras).
- **SaaS**: sistema que funciona pela internet (não fica instalado só no computador).
- **Hotspot / ancoragem**: usar o celular como roteador de internet.
- **Mesh / repetidor**: aparelhos para levar o Wi-Fi mais longe.
