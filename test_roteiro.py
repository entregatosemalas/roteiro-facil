"""
Testes de UX – Roteiro Fácil  (versão 3 – fixes de seletor e stale ref)
"""
import json
from playwright.sync_api import sync_playwright, Page

BASE = "file:///Users/imoto/Documents/GitHub/roteiro-facil/index.html"
BUGS = []

def bug(persona, doing, what_happened, likely_cause):
    BUGS.append({"persona":persona,"doing":doing,"what_happened":what_happened,"likely_cause":likely_cause})
    print(f"\n🐛 [{persona}] {what_happened}")
    print(f"   Fazendo: {doing}")
    print(f"   Causa:   {likely_cause}")

def nav(p): p.goto(BASE); p.wait_for_load_state("domcontentloaded")

def login(p, name="Tester"):
    p.evaluate(f"""()=>{{
        user={{email:'t@t.com',name:'{name}'}};
        document.getElementById('uname').textContent=user.name;
        document.getElementById('uname2').textContent=user.name;
        goStep(1);show('s-wizard');
    }}""")

def set_airport(p, which, name, lat, lng):
    p.evaluate(f"()=>setAirport('{which}',{{name:'{name}',lat:{lat},lng:{lng},fullName:'{name}'}})")

def add_cities(p, lst):
    p.evaluate("(l)=>{l.forEach(c=>cities.push({name:c.name,lat:c.lat,lng:c.lng,days:c.days||2,hotel:null,hotelConfirmed:false}));renderCities();}", lst)

def add_pts(p, lst):
    p.evaluate("(l)=>{manualPts=l.map(x=>({name:x.name,lat:x.lat,lng:x.lng,desc:x.desc||'',note:'',cat:x.cat||'atracao',manual:true}));renderManualList();}", lst)

def gen(p):
    p.evaluate("document.getElementById('chk-disclaimer').checked=true;")
    p.click("#btn-gen")
    p.wait_for_function("document.getElementById('s-res').style.display!=='none'||document.getElementById('gen-err').style.display!=='none'",timeout=12000)

def ok(p): return p.evaluate("document.getElementById('s-res').style.display!=='none'")

def click_in_overlay_popup(p, btn_text):
    """Clica no botão do hotel-assign-overlay pelo texto (evita conflito com #btn-login.primary)."""
    p.evaluate(f"""()=>{{
        var btns=document.querySelectorAll('#hotel-assign-actions button');
        for(var b of btns){{if(b.textContent.trim().includes('{btn_text}')){{b.click();break;}}}}
    }}""")

def ss(p, n): p.screenshot(path=f"/tmp/test_{n}.png")


# ─── P1: Organizada ──────────────────────────────────────────────────────────
def p1(page):
    print("\n"+"="*60+"\nPERSONA 1: Maria – organizada\n"+"="*60)
    nav(page); login(page,"Maria")

    set_airport(page,"arrival","Narita International Airport",35.7719,140.3929)
    arrw = page.evaluate("document.getElementById('arr-date-wrap').style.display==='block'")
    print(f"  arr-date-wrap visível: {arrw}")
    if not arrw:
        bug("P1","Selecionar aeroporto chegada","arr-date-wrap NÃO apareceu","renderAirportTag() não exibe arr-date-wrap")

    page.evaluate("document.getElementById('arr-date').value='2025-10-10';")
    set_airport(page,"departure","Kansai International Airport",34.4272,135.2440)
    depw = page.evaluate("document.getElementById('dep-date-wrap').style.display==='block'")
    print(f"  dep-date-wrap visível: {depw}")
    if not depw:
        bug("P1","Selecionar aeroporto saída","dep-date-wrap NÃO apareceu","renderAirportTag('departure') não exibe dep-date-wrap")
    page.evaluate("document.getElementById('dep-date').value='2025-10-20';")

    page.click("#btn-step1-next")
    add_cities(page,[
        {"name":"Tóquio","lat":35.6762,"lng":139.6503,"days":4},
        {"name":"Kyoto", "lat":35.0116,"lng":135.7681,"days":3},
        {"name":"Osaka", "lat":34.6937,"lng":135.5023,"days":2},
    ])
    page.click("#btn-step2-next")
    add_pts(page,[
        {"name":"Senso-ji","lat":35.7148,"lng":139.7967,"cat":"templo"},
        {"name":"Shibuya Crossing","lat":35.6595,"lng":139.7004,"cat":"atracao"},
        {"name":"Shinjuku Gyoen","lat":35.6851,"lng":139.7100,"cat":"natureza"},
        {"name":"Tsukiji Market","lat":35.6654,"lng":139.7706,"cat":"almoco"},
        {"name":"Harajuku","lat":35.6702,"lng":139.7026,"cat":"compras"},
        {"name":"Tokyo Tower","lat":35.6586,"lng":139.7454,"cat":"atracao"},
        {"name":"Ueno Park","lat":35.7156,"lng":139.7733,"cat":"natureza"},
        {"name":"Fushimi Inari","lat":34.9671,"lng":135.7727,"cat":"templo"},
        {"name":"Kinkakuji","lat":35.0394,"lng":135.7292,"cat":"templo"},
        {"name":"Arashiyama","lat":35.0094,"lng":135.6694,"cat":"natureza"},
        {"name":"Gion","lat":35.0037,"lng":135.7784,"cat":"atracao"},
        {"name":"Dotonbori","lat":34.6687,"lng":135.5019,"cat":"atracao"},
        {"name":"Osaka Castle","lat":34.6873,"lng":135.5262,"cat":"atracao"},
        {"name":"Shinsekai","lat":34.6528,"lng":135.5063,"cat":"atracao"},
    ])
    gen(page)
    if not ok(page): bug("P1","Gerar roteiro","Não gerou","doGen()"); return

    days = page.evaluate("itin.length")
    d0d  = page.evaluate("itin[0].date")
    lnd  = page.evaluate("itin[itin.length-1].date")
    f0c  = page.evaluate("itin[0].stops[0].cat")
    lcs  = page.evaluate("itin[itin.length-1].stops.map(s=>s.cat)")
    bhas = page.evaluate("document.getElementById('hotel-banner').classList.contains('has-hotel')")

    print(f"  Dias: {days}  |  Data D1: {d0d}  |  Data último: {lnd}")
    print(f"  1ª parada D1: {f0c}  |  cats último dia: {lcs}")
    print(f"  Banner has-hotel (sem hotel): {bhas}")

    if d0d!="2025-10-10": bug("P1","Data chegada","Data D1 errada: "+d0d,"doGen() não aplica arr-date")
    if lnd!="2025-10-20": bug("P1","Data saída","Data último dia errada: "+lnd,"doGen() não aplica dep-date")
    if f0c!="aeroporto-chegada": bug("P1","Aeroporto chegada D1","1ª parada é "+f0c,"doGen() unshift ausente")
    if "aeroporto-saida" not in lcs: bug("P1","Aeroporto saída último dia","aeroporto-saida ausente: "+str(lcs),"doGen() push ausente")
    if bhas: bug("P1","Banner sem hotel","Banner mostra has-hotel sem hotel","updateHotelBanner() bug")

    # PDF
    with page.expect_popup() as pi: page.click("#btn-pdf")
    pop=pi.value; pop.wait_for_load_state("domcontentloaded")
    has_d1=pop.evaluate("document.body.innerHTML.includes('Dia 1')")
    print(f"  PDF contém 'Dia 1': {has_d1}")
    if not has_d1: bug("P1","PDF","PDF sem 'Dia 1'","doPDF() bug")
    pop.close()

    ss(page,"p1"); print("  ✅ P1 OK\n")


# ─── P2: Pula etapas ─────────────────────────────────────────────────────────
def p2(page):
    print("\n"+"="*60+"\nPERSONA 2: João – pula etapas\n"+"="*60)
    nav(page); login(page,"João")

    page.click("#btn-step1-next")
    page.click("#btn-step2-next")
    add_pts(page,[
        {"name":"Senso-ji","lat":35.7148,"lng":139.7967},
        {"name":"Tokyo Tower","lat":35.6586,"lng":139.7454},
        {"name":"Shibuya","lat":35.6595,"lng":139.7004},
        {"name":"Akihabara","lat":35.7022,"lng":139.7741},
        {"name":"Ueno","lat":35.7156,"lng":139.7733},
        {"name":"Meiji Shrine","lat":35.6764,"lng":139.6993},
    ])
    pts_b4 = page.evaluate("manualPts.length")
    page.click("#btn-step3-back"); page.wait_for_timeout(200)
    step = page.evaluate("wizStep")
    print(f"  Step após voltar: {step}")
    if step!=2: bug("P2","← Voltar step3","Voltou para "+str(step)+" (esperava 2)","btn-step3-back listener")

    add_cities(page,[{"name":"Osaka","lat":34.6937,"lng":135.5023,"days":2}])
    page.click("#btn-step2-next"); page.wait_for_timeout(200)
    pts_af = page.evaluate("manualPts.length")
    print(f"  Pontos antes/depois de navegar: {pts_b4}/{pts_af}")
    if pts_af!=pts_b4: bug("P2","step3→2→3","Pontos perdidos: "+str(pts_af)+" vs "+str(pts_b4),"manualPts resetado")

    page.click("#btn-gen"); page.wait_for_timeout(400)
    err_vis = page.evaluate("document.getElementById('gen-err').style.display!=='none'")
    print(f"  Erro sem disclaimer: {err_vis}")
    if not err_vis: bug("P2","Gerar sem disclaimer","Gerou sem disclaimer","doGen() não valida chk-disclaimer")

    gen(page)
    if not ok(page): return
    days = page.evaluate("itin.length")
    print(f"  Dias gerados: {days}")

    page.click("#tb-map"); page.wait_for_timeout(500)
    map_v = page.evaluate("document.getElementById('v-map').style.display!=='none'")
    print(f"  Aba Mapa: {map_v}")
    if not map_v: bug("P2","Aba Mapa","Mapa não visível","goTab('map') bug")
    page.click("#tb-tl"); page.wait_for_timeout(300)

    page.click("#btn-reset"); page.wait_for_timeout(300)
    wiz_v = page.evaluate("document.getElementById('s-wizard').style.display!=='none'")
    itin0 = page.evaluate("itin.length")
    print(f"  +Novo: wizard={wiz_v}, itin.length={itin0}")
    if not wiz_v: bug("P2","+Novo","Não voltou ao wizard","doReset() bug")
    if itin0!=0: bug("P2","+Novo","itin não zerado: "+str(itin0),"resetWizardState() bug")

    ss(page,"p2"); print("  ✅ P2 OK\n")


# ─── P3: Erros e correções; hotel ────────────────────────────────────────────
def p3(page):
    print("\n"+"="*60+"\nPERSONA 3: Ana – erra e corrige, hotel\n"+"="*60)
    nav(page); login(page,"Ana")

    set_airport(page,"arrival","Haneda Airport",35.5494,139.7798)
    page.evaluate("document.getElementById('arr-date').value='2025-11-05';")
    set_airport(page,"departure","Chubu Centrair",34.8583,136.8050)
    page.evaluate("document.getElementById('dep-date').value='2025-11-15';")

    # same-airport
    page.evaluate("airports.arrival={name:'Haneda Airport',lat:35.5494,lng:139.7798};")
    page.check("#same-airport"); page.wait_for_timeout(300)
    dep = page.evaluate("airports.departure?airports.departure.name:null")
    arr = page.evaluate("airports.arrival?airports.arrival.name:null")
    print(f"  same-airport: arrival={arr}, departure={dep}")
    if dep!=arr: bug("P3","same-airport","Departure ≠ Arrival após checkbox","listener #same-airport bug")
    page.uncheck("#same-airport"); page.wait_for_timeout(200)

    page.click("#btn-step1-next")
    add_cities(page,[{"name":"Kyoto","lat":35.0116,"lng":135.7681,"days":3}])
    page.click("#btn-step2-next")
    add_pts(page,[
        {"name":"Kinkakuji","lat":35.0394,"lng":135.7292,"cat":"templo"},
        {"name":"Fushimi Inari","lat":34.9671,"lng":135.7727,"cat":"templo"},
        {"name":"Gion","lat":35.0037,"lng":135.7784,"cat":"atracao"},
        {"name":"Arashiyama","lat":35.0094,"lng":135.6694,"cat":"natureza"},
        {"name":"Nijo Castle","lat":35.0142,"lng":135.7481,"cat":"atracao"},
        {"name":"Philosopher's Path","lat":35.0245,"lng":135.7965,"cat":"natureza"},
    ])
    gen(page)
    if not ok(page): return
    days = page.evaluate("itin.length")
    print(f"  Dias: {days}")

    # Muda categoria de um stop para hotel → popup deve abrir
    opened = False
    for sel in page.query_selector_all(".cat-select"):
        val = page.evaluate("el=>el.value",sel)
        if val not in ("aeroporto-chegada","aeroporto-saida","hotel","aeroporto"):
            page.evaluate("(el)=>{el.value='hotel';el.dispatchEvent(new Event('change'));}", sel)
            page.wait_for_timeout(500)
            opened = page.evaluate("document.getElementById('hotel-assign-overlay').classList.contains('on')")
            break
    print(f"  Popup hotel (cat→hotel): {opened}")
    if not opened: bug("P3","Mudar cat→hotel","Popup não abriu","cat-select handler bug")

    if opened:
        # Datas inválidas
        page.evaluate("document.getElementById('hotel-checkin').value='2025-11-10';")
        page.evaluate("document.getElementById('hotel-checkout').value='2025-11-08';")
        page.evaluate("document.getElementById('hotel-checkin').dispatchEvent(new Event('input'));")
        page.evaluate("document.getElementById('hotel-checkout').dispatchEvent(new Event('input'));")
        page.wait_for_timeout(300)
        err_v = page.evaluate("document.getElementById('hotel-date-err').style.display!=='none'")
        print(f"  Erro checkout<checkin: {err_v}")
        if not err_v: bug("P3","checkout<checkin","Erro não apareceu","updateNightsInfo() não valida ordem")

        # Datas corretas
        page.evaluate("document.getElementById('hotel-checkin').value='2025-11-06';")
        page.evaluate("document.getElementById('hotel-checkout').value='2025-11-09';")
        page.evaluate("document.getElementById('hotel-checkin').dispatchEvent(new Event('input'));")
        page.evaluate("document.getElementById('hotel-checkout').dispatchEvent(new Event('input'));")
        page.wait_for_timeout(300)
        ni_v = page.evaluate("document.getElementById('hotel-nights-info').style.display!=='none'")
        ni_t = page.evaluate("document.getElementById('hotel-nights-info').textContent")
        print(f"  Info noites: {ni_v} – '{ni_t}'")
        if not ni_v: bug("P3","Datas válidas no popup","Info de noites não apareceu","updateNightsInfo() bug")

        # Confirma – usa JS direto para evitar ambiguidade de seletor
        click_in_overlay_popup(page,"Adicionar hotel")
        page.wait_for_timeout(700)

        # Banner
        has_h = page.evaluate("document.getElementById('hotel-banner').classList.contains('has-hotel')")
        print(f"  Banner has-hotel após confirmar: {has_h}")
        if not has_h: bug("P3","Confirmar hotel","Banner não atualizado","updateHotelBanner() bug")

        # Repetição no banner
        hotel_names = page.evaluate("itin.flatMap(d=>d.stops.filter(s=>s.cat==='hotel').map(s=>s.name))")
        banner_html  = page.evaluate("document.getElementById('hotel-info').innerHTML")
        if hotel_names:
            hn = hotel_names[0]
            count = banner_html.count(hn)
            print(f"  Aparições do hotel no banner: {count}x")
            if count>1:
                bug("P3","Banner hotel multi-dias",f"Nome '{hn}' aparece {count}x (esperava 1x)","updateHotelBanner() não deduplica")

        # hotelGroup foi atribuído?
        hg_set = page.evaluate("itin.some(d=>d.hotelGroup)")
        print(f"  hotelGroup atribuído a algum dia: {hg_set}")
        if not hg_set:
            bug("P3","hotelGroup após confirmar hotel","Nenhum dia recebeu hotelGroup","applyHotelToDays() não marca hotelGroup")

    # Reordenação por data
    if days >= 3:
        page.evaluate("""()=>{
            itin[0].date='2025-11-10'; itin[0].hotelGroup=null;
            itin[1].date='2025-11-08'; itin[1].hotelGroup=null;
            itin[2].date='2025-11-09'; itin[2].hotelGroup=null;
            sortItinByDate(); renderTL();
        }""")
        page.wait_for_timeout(300)
        dates = page.evaluate("itin.map(d=>d.date)")
        print(f"  Após sortItinByDate([10,08,09]): {dates}")
        if dates[0]!="2025-11-08":
            bug("P3","sortItinByDate([10,08,09])","Primeiro dia não é 2025-11-08: "+str(dates),"sortItinByDate() bug")

    ss(page,"p3"); print("  ✅ P3 OK\n")


# ─── P4: Muitas cidades ──────────────────────────────────────────────────────
def p4(page):
    print("\n"+"="*60+"\nPERSONA 4: Carlos – muitas cidades\n"+"="*60)
    nav(page); login(page,"Carlos")

    set_airport(page,"arrival","Narita International Airport",35.7719,140.3929)
    page.evaluate("document.getElementById('arr-date').value='2025-03-01';")
    set_airport(page,"departure","Kansai International Airport",34.4272,135.2440)
    page.evaluate("document.getElementById('dep-date').value='2025-03-21';")

    page.click("#btn-step1-next")
    add_cities(page,[
        {"name":"Tóquio","lat":35.6762,"lng":139.6503,"days":4},
        {"name":"Hakone","lat":35.2326,"lng":139.1069,"days":2},
        {"name":"Kyoto","lat":35.0116,"lng":135.7681,"days":3},
        {"name":"Nara","lat":34.6851,"lng":135.8050,"days":1},
        {"name":"Osaka","lat":34.6937,"lng":135.5023,"days":2},
        {"name":"Hiroshima","lat":34.3853,"lng":132.4553,"days":2},
    ])
    page.click("#btn-step2-next")
    add_pts(page,[
        {"name":"Senso-ji","lat":35.7148,"lng":139.7967,"cat":"templo"},
        {"name":"Shibuya Crossing","lat":35.6595,"lng":139.7004,"cat":"atracao"},
        {"name":"Tokyo Tower","lat":35.6586,"lng":139.7454,"cat":"atracao"},
        {"name":"Shinjuku Gyoen","lat":35.6851,"lng":139.7100,"cat":"natureza"},
        {"name":"Akihabara","lat":35.7022,"lng":139.7741,"cat":"compras"},
        {"name":"Tsukiji Market","lat":35.6654,"lng":139.7706,"cat":"almoco"},
        {"name":"Harajuku","lat":35.6702,"lng":139.7026,"cat":"compras"},
        {"name":"Ueno Park","lat":35.7156,"lng":139.7733,"cat":"natureza"},
        {"name":"Hakone Open Air Museum","lat":35.2523,"lng":139.0449,"cat":"atracao"},
        {"name":"Lake Ashi","lat":35.1977,"lng":139.0199,"cat":"natureza"},
        {"name":"Owakudani","lat":35.2572,"lng":139.0228,"cat":"natureza"},
        {"name":"Fushimi Inari","lat":34.9671,"lng":135.7727,"cat":"templo"},
        {"name":"Kinkakuji","lat":35.0394,"lng":135.7292,"cat":"templo"},
        {"name":"Arashiyama","lat":35.0094,"lng":135.6694,"cat":"natureza"},
        {"name":"Nishiki Market","lat":35.0050,"lng":135.7660,"cat":"compras"},
        {"name":"Gion","lat":35.0037,"lng":135.7784,"cat":"atracao"},
        {"name":"Todai-ji","lat":34.6889,"lng":135.8398,"cat":"templo"},
        {"name":"Nara Park","lat":34.6851,"lng":135.8390,"cat":"natureza"},
        {"name":"Dotonbori","lat":34.6687,"lng":135.5019,"cat":"atracao"},
        {"name":"Osaka Castle","lat":34.6873,"lng":135.5262,"cat":"atracao"},
        {"name":"Shinsekai","lat":34.6528,"lng":135.5063,"cat":"atracao"},
        {"name":"Peace Memorial Park","lat":34.3953,"lng":132.4536,"cat":"atracao"},
        {"name":"Hiroshima Castle","lat":34.4018,"lng":132.4596,"cat":"atracao"},
        {"name":"Itsukushima Shrine","lat":34.2957,"lng":132.3196,"cat":"templo"},
    ])
    gen(page)
    if not ok(page): return

    days  = page.evaluate("itin.length")
    total = page.evaluate("itin.reduce((t,d)=>t+d.stops.length,0)")
    empty = page.evaluate("itin.filter(d=>d.stops.length===0).length")
    print(f"  Dias: {days}  |  Stops total: {total}  |  Dias vazios: {empty}")
    if empty>0: bug("P4","Gerar 6 cidades/24pts",f"{empty} dia(s) vazio(s)","kmeansMulti() cluster vazio")

    # Mistura de cidades no mesmo dia?
    mix_found = False
    for i,d in enumerate(page.evaluate("itin.map(d=>({city:d.cityName,lats:d.stops.map(s=>s.lat)}))")):
        lats=[l for l in d['lats'] if l]
        if len(lats)>=2 and (max(lats)-min(lats))>0.8:
            bug("P4",f"Dia {i+1} geográfico",f"Dia {i+1} [{d['city']}] mistura lat range {max(lats)-min(lats):.2f}°","assignPtsToCity() bug")
            mix_found=True
    if not mix_found: print("  Sem mistura geográfica indevida ✓")

    # Colapso – re-query após any renderTL()
    page.evaluate("toggleDay(0)")
    page.wait_for_timeout(300)
    col = page.evaluate("itin[0].collapsed===true")
    print(f"  Colapso dia 1: {col}")
    if not col: bug("P4","Colapsar dia","collapsed não ficou true","toggleDay() bug")
    page.evaluate("toggleDay(0)"); page.wait_for_timeout(200)  # reabre

    # Mover stop entre dias via JS (evita stale element)
    d0_b = page.evaluate("itin[0].stops.length")
    d1_b = page.evaluate("itin[1].stops.length")
    page.evaluate("""()=>{
        if(itin[0].stops.length>0){
            var s=itin[0].stops.splice(0,1)[0];
            itin[1].stops.push(s);
            recalcTravel(0);recalcTravel(1);renderTL();
        }
    }""")
    page.wait_for_timeout(300)
    d0_a = page.evaluate("itin[0].stops.length")
    d1_a = page.evaluate("itin[1].stops.length")
    print(f"  Mover stop D1→D2: D1 {d0_b}→{d0_a}, D2 {d1_b}→{d1_a}")
    if d0_a>=d0_b: bug("P4","Mover stop D1→D2","Stop não moveu","splice/push em itin com bug")

    # Download JSON
    try:
        with page.expect_download(timeout=5000) as dl:
            page.evaluate("saveRoteiro()")
        fname=dl.value.suggested_filename
        print(f"  Download: '{fname}'")
        if not fname.endswith(".json"):
            bug("P4","saveRoteiro()","Arquivo sem .json: "+fname,"saveRoteiro() blob bug")
    except Exception as e:
        bug("P4","saveRoteiro()","Download falhou: "+str(e),"saveRoteiro() não triggering download")

    # sortItinByDate não perde dias
    page.evaluate(f"""()=>{{
        itin[0].date='2025-03-15'; itin[0].hotelGroup=null;
        sortItinByDate(); renderTL();
    }}""")
    page.wait_for_timeout(300)
    days_a = page.evaluate("itin.length")
    print(f"  Dias após sortItinByDate: {days_a} (esperava {days})")
    if days_a!=days: bug("P4","sortItinByDate com muitos dias",f"Dias: {days}→{days_a}","sortItinByDate() perde dias")

    # Personalização de cores: abre painel e verifica pickers
    page.evaluate("document.getElementById('clr-body').classList.add('open');")
    page.evaluate("renderDayColorPickers();")
    page.wait_for_timeout(200)
    pickers = page.evaluate("document.querySelectorAll('.dclr').length")
    print(f"  Color pickers renderizados: {pickers} (esperava {days_a*2})")
    if pickers!=days_a*2:
        bug("P4","Painel de cores","Número de pickers errado: "+str(pickers)+" vs "+str(days_a*2),"renderDayColorPickers() bug")

    ss(page,"p4"); print("  ✅ P4 OK\n")


# ─── P5: Mínimo ──────────────────────────────────────────────────────────────
def p5(page):
    print("\n"+"="*60+"\nPERSONA 5: Beatriz – mínimo de info, UX fino\n"+"="*60)
    nav(page); login(page,"Beatriz")

    page.click("#btn-step1-next"); page.click("#btn-step2-next")
    add_pts(page,[
        {"name":"Senso-ji","lat":35.7148,"lng":139.7967,"cat":"templo"},
        {"name":"Shibuya Crossing","lat":35.6595,"lng":139.7004,"cat":"atracao"},
        {"name":"Shinjuku","lat":35.6938,"lng":139.7034,"cat":"compras"},
    ])
    gen(page)
    if not ok(page): bug("P5","Gerar 3 pts","Não gerou","doGen() bug"); return

    days = page.evaluate("itin.length")
    s0   = page.evaluate("itin[0].stops.length")
    print(f"  Dias: {days}, Stops D1: {s0}")
    if days<1: bug("P5","3 pts→gerar","Nenhum dia","doGen() bug 3pts")
    if s0<3:   bug("P5","3 pts D1","Stops="+str(s0)+" <3","nearestNeighbor() descartando pts")

    # Modal abre
    page.click("#btn-add-res"); page.wait_for_timeout(300)
    mo = page.evaluate("document.getElementById('modal-add').classList.contains('on')")
    print(f"  Modal abriu: {mo}")
    if not mo: bug("P5","+ Local","Modal não abriu","btn-add-res listener bug")

    # Fecha clicando fora
    if mo:
        box = page.query_selector("#modal-add").bounding_box()
        page.mouse.click(box['x']+3,box['y']+3); page.wait_for_timeout(300)
        mc = not page.evaluate("document.getElementById('modal-add').classList.contains('on')")
        print(f"  Fecha ao clicar fora: {mc}")
        if not mc: bug("P5","Clicar fora do modal","Modal não fechou","overlay click listener bug")

    # Adicionar local via modal (preenche via JS)
    page.click("#btn-add-res"); page.wait_for_timeout(300)
    page.evaluate("""()=>{
        document.getElementById('add-name').value='Harajuku Takeshita';
        document.getElementById('add-lat').value='35.6702';
        document.getElementById('add-lng').value='139.7026';
        document.getElementById('manual-form').style.display='block';
        document.getElementById('btn-add-confirm').style.display='inline-block';
        selectedCat='compras';
        document.querySelectorAll('.cat-pill').forEach(p=>{
            p.classList.toggle('selected',p.getAttribute('data-cat')==='compras');
        });
    }""")
    page.click("#btn-add-confirm"); page.wait_for_timeout(500)
    s1 = page.evaluate("itin[0].stops.length")
    print(f"  Stops após adicionar Harajuku: {s1} (esperava {s0+1})")
    if s1<=s0: bug("P5","Adicionar local em resultados",f"Stop não inserido: {s0}→{s1}","confirmAddLocal() bug")

    # Duração
    page.evaluate("(el)=>{el.value=180;el.dispatchEvent(new Event('change'));}", page.query_selector_all(".dur-input")[0])
    page.wait_for_timeout(300)
    dur = page.evaluate("itin[0].stops[0].duration")
    print(f"  Duração após 180min: {dur}")
    if dur!=180: bug("P5","Alterar duração","Duration="+str(dur),"dur-input handler bug")

    # Nota
    page.evaluate(
        "(el)=>{el.value='Chegar cedo!';el.dispatchEvent(new Event('input'));}",
        page.query_selector_all(".note-input")[0]
    )
    page.wait_for_timeout(200)
    note = page.evaluate("itin[0].stops[0].note")
    print(f"  Nota salva: '{note}'")
    if note!="Chegar cedo!": bug("P5","Nota pessoal","Nota não salva: '"+note+"'","note-input handler bug")

    # Remover stop
    srm = page.evaluate("itin[0].stops.length")
    page.evaluate("(el)=>el.click()", page.query_selector_all(".rm-btn")[0])
    page.wait_for_timeout(300)
    arm = page.evaluate("itin[0].stops.length")
    print(f"  Remover stop: {srm}→{arm}")
    if arm>=srm: bug("P5","Remover stop","Stop não removido","rm-btn handler bug")

    # Popup aeroporto-chegada
    for sel in page.query_selector_all(".cat-select"):
        val = page.evaluate("el=>el.value",sel)
        if val not in ("aeroporto-chegada","aeroporto-saida","hotel","aeroporto"):
            page.evaluate("(el)=>{el.value='aeroporto-chegada';el.dispatchEvent(new Event('change'));}", sel)
            page.wait_for_timeout(500)
            pop_arr = page.evaluate("document.getElementById('hotel-assign-overlay').classList.contains('on')")
            print(f"  Popup data ao mudar→aeroporto-chegada: {pop_arr}")
            if not pop_arr: bug("P5","Mudar cat→aeroporto-chegada","Popup de data não abriu","openAirportDatePopup() não chamado")
            else:
                click_in_overlay_popup(page,"Pular"); page.wait_for_timeout(300)
            break

    # Popup aeroporto-saida
    for sel in page.query_selector_all(".cat-select"):
        val = page.evaluate("el=>el.value",sel)
        if val not in ("aeroporto-chegada","aeroporto-saida","hotel","aeroporto"):
            page.evaluate("(el)=>{el.value='aeroporto-saida';el.dispatchEvent(new Event('change'));}", sel)
            page.wait_for_timeout(500)
            pop_dep = page.evaluate("document.getElementById('hotel-assign-overlay').classList.contains('on')")
            print(f"  Popup data ao mudar→aeroporto-saida: {pop_dep}")
            if not pop_dep: bug("P5","Mudar cat→aeroporto-saida","Popup de data não abriu","openAirportDatePopup() não chamado")
            else:
                click_in_overlay_popup(page,"Pular"); page.wait_for_timeout(300)
            break

    # Horário de início
    page.evaluate(
        "(el)=>{el.value='08:30';el.dispatchEvent(new Event('change'));}",
        page.query_selector_all(".start-input")[0]
    )
    page.wait_for_timeout(300)
    sh = page.evaluate("itin[0].startH"); sm = page.evaluate("itin[0].startM")
    print(f"  startH/M após 08:30: {sh}:{sm:02d}")
    if sh!=8 or sm!=30: bug("P5","Alterar início para 08:30",f"={sh}:{sm}","start-input handler bug")

    ss(page,"p5"); print("  ✅ P5 OK\n")


# ─── RUNNER ──────────────────────────────────────────────────────────────────
def run():
    with sync_playwright() as pw:
        br = pw.chromium.launch(headless=True)
        ctx= br.new_context(viewport={"width":1280,"height":800},accept_downloads=True)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: bug("JS","runtime",str(e),"Erro JS"))

        for fn in [p1,p2,p3,p4,p5]:
            try:
                fn(pg)
            except Exception as e:
                bug(fn.__name__,"execução","Exceção: "+str(e),"ver traceback")
                import traceback; traceback.print_exc()

        br.close()

    print("\n"+"="*60+"\nRELATÓRIO FINAL\n"+"="*60)
    if not BUGS:
        print("✅ Nenhum bug encontrado!")
    else:
        for i,b in enumerate(BUGS,1):
            print(f"\n🐛 #{i} [{b['persona']}] {b['what_happened']}")
            print(f"   Fazendo:  {b['doing']}")
            print(f"   Causa:    {b['likely_cause']}")
    print(f"\nTotal: {len(BUGS)} bug(s)")
    with open("/tmp/bugs_report.json","w") as f:
        json.dump(BUGS,f,ensure_ascii=False,indent=2)
    return BUGS

if __name__=="__main__":
    run()
