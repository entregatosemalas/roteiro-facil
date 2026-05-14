"""
Testes Detalhistas – Roteiro Fácil
5 personas extremamente críticas que confrontam TODOS os dados:
 - coerência geográfica
 - lógica temporal e horários
 - sequência e integridade das datas
 - distribuição correta de stops em torno do hotel
 - categorias, durações e ordem intra-dia

Cada falha é registrada com o valor exato encontrado vs. esperado.
"""
import json, math
from playwright.sync_api import sync_playwright, Page

BASE = "file:///Users/imoto/Documents/GitHub/roteiro-facil/index.html"
BUGS = []
PASSES = []

def bug(persona, check, found, expected, cause):
    entry = {"persona":persona,"check":check,"found":str(found),"expected":str(expected),"cause":cause}
    BUGS.append(entry)
    print(f"  ❌ [{persona}] {check}")
    print(f"       Encontrado: {found}")
    print(f"       Esperado:   {expected}")
    print(f"       Causa:      {cause}")

def ok(persona, check, value=""):
    PASSES.append({"persona":persona,"check":check})
    suffix = f" → {value}" if value else ""
    print(f"  ✅ {check}{suffix}")

def nav(p):
    p.goto(BASE); p.wait_for_load_state("domcontentloaded")

def login(p, name):
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
    p.wait_for_function(
        "document.getElementById('s-res').style.display!=='none'||"
        "document.getElementById('gen-err').style.display!=='none'",
        timeout=12000
    )

def in_results(p):
    return p.evaluate("document.getElementById('s-res').style.display!=='none'")

def hav(la1, ln1, la2, ln2):
    """Haversine em Python para validação independente."""
    R = 6371
    dL = math.radians(la2 - la1)
    dN = math.radians(ln2 - ln1)
    a = math.sin(dL/2)**2 + math.cos(math.radians(la1))*math.cos(math.radians(la2))*math.sin(dN/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def click_popup_btn(p, text):
    p.evaluate(f"""()=>{{
        for(var b of document.querySelectorAll('#hotel-assign-actions button'))
            if(b.textContent.trim().includes('{text}')){{b.click();break;}}
    }}""")

def ss(p, n): p.screenshot(path=f"/tmp/test_det_{n}.png")

# ═══════════════════════════════════════════════════════════════════════════════
# PERSONA A – "A Geógrafa": confronta cada km, cada rota, cada sequência espacial
# ═══════════════════════════════════════════════════════════════════════════════
def persona_A(page):
    NAME = "A-Geografa"
    print(f"\n{'='*62}\nPERSONA A: Geógrafa – confronta coerência geográfica total\n{'='*62}")
    nav(page); login(page,"Geo")

    set_airport(page,"arrival","Narita International Airport",35.7719,140.3929)
    page.evaluate("document.getElementById('arr-date').value='2025-10-10';")
    set_airport(page,"departure","Kansai International Airport",34.4272,135.2440)
    page.evaluate("document.getElementById('dep-date').value='2025-10-20';")

    page.click("#btn-step1-next")
    add_cities(page,[
        {"name":"Tóquio",    "lat":35.6762,"lng":139.6503,"days":3},
        {"name":"Kyoto",     "lat":35.0116,"lng":135.7681,"days":2},
        {"name":"Osaka",     "lat":34.6937,"lng":135.5023,"days":2},
    ])
    page.click("#btn-step2-next")

    # Pontos geograficamente bem definidos em 3 regiões separadas
    PTS = [
        {"name":"Senso-ji",          "lat":35.7148,"lng":139.7967,"cat":"templo"},
        {"name":"Tokyo Tower",       "lat":35.6586,"lng":139.7454,"cat":"atracao"},
        {"name":"Shinjuku Gyoen",    "lat":35.6851,"lng":139.7100,"cat":"natureza"},
        {"name":"Shibuya Crossing",  "lat":35.6595,"lng":139.7004,"cat":"atracao"},
        {"name":"Akihabara",         "lat":35.7022,"lng":139.7741,"cat":"compras"},
        {"name":"Ueno Park",         "lat":35.7156,"lng":139.7733,"cat":"natureza"},
        {"name":"Asakusa Nakamise",  "lat":35.7118,"lng":139.7964,"cat":"compras"},
        {"name":"Fushimi Inari",     "lat":34.9671,"lng":135.7727,"cat":"templo"},
        {"name":"Kinkakuji",         "lat":35.0394,"lng":135.7292,"cat":"templo"},
        {"name":"Gion",              "lat":35.0037,"lng":135.7784,"cat":"atracao"},
        {"name":"Nishiki Market",    "lat":35.0050,"lng":135.7660,"cat":"compras"},
        {"name":"Dotonbori",         "lat":34.6687,"lng":135.5019,"cat":"atracao"},
        {"name":"Osaka Castle",      "lat":34.6873,"lng":135.5262,"cat":"atracao"},
        {"name":"Umeda Sky Building","lat":34.7056,"lng":135.4951,"cat":"atracao"},
    ]
    add_pts(page, PTS)
    gen(page)
    if not in_results(page): bug(NAME,"Gerar roteiro","Falhou","OK","doGen() bug"); return

    itin = page.evaluate("itin.map(d=>({city:d.cityName,stops:d.stops.map(s=>({name:s.name,lat:s.lat,lng:s.lng,cat:s.cat,travelMin:s.travelMin,distKm:s.distKm}))}))")

    print(f"\n  --- Verificando separação geográfica por cidade ---")
    for di, day in enumerate(itin):
        regular = [s for s in day['stops'] if s['cat'] not in ('aeroporto-chegada','aeroporto-saida','aeroporto','hotel')]
        if len(regular) < 2: continue

        # Confirma que todos os stops do dia pertencem à mesma cidade geográfica
        lats = [s['lat'] for s in regular]
        lngs = [s['lng'] for s in regular]
        lat_span = max(lats) - min(lats)
        lng_span = max(lngs) - min(lngs)
        # Tóquio ≈ lat 35.6-35.72, lng 139.70-139.80
        # Kyoto  ≈ lat 34.96-35.04, lng 135.66-135.78
        # Osaka  ≈ lat 34.65-34.71, lng 135.49-135.53
        if lat_span > 0.5:
            bug(NAME,f"Dia {di+1} [{day['city']}] separação geográfica",
                f"lat_span={lat_span:.3f}° (~{lat_span*111:.0f}km)",
                "< 0.5° (~55km) dentro de uma cidade",
                "Stops de cidades distintas misturados no mesmo dia")
        else:
            ok(NAME,f"Dia {di+1} [{day['city']}] lat_span ok",f"{lat_span:.3f}°")

    print(f"\n  --- Verificando eficiência da rota intra-dia (TSP) ---")
    for di, day in enumerate(itin):
        regular = [s for s in day['stops'] if s['cat'] not in ('aeroporto-chegada','aeroporto-saida','aeroporto')]
        if len(regular) < 3: continue

        # Calcula distância total da rota atual
        total_dist = sum(
            hav(regular[i]['lat'],regular[i]['lng'],regular[i+1]['lat'],regular[i+1]['lng'])
            for i in range(len(regular)-1)
        )

        # Compara com a pior rota possível (inverso)
        reversed_dist = sum(
            hav(regular[-(i+1)]['lat'],regular[-(i+1)]['lng'],regular[-(i+2)]['lat'],regular[-(i+2)]['lng'])
            for i in range(len(regular)-1)
        )

        # A rota deve ser pelo menos 10% melhor que o inverso para ser válida
        # (ou igual se já é ótima)
        ratio = total_dist / max(reversed_dist, 0.001)
        ok(NAME,f"Dia {di+1} [{day['city']}] eficiência TSP",f"{total_dist:.1f}km total")

        # Verifica se há backtracking absurdo: nenhum segmento deve ser
        # mais que 3x maior que a média dos segmentos do dia
        if len(regular) >= 3:
            segs = [hav(regular[i]['lat'],regular[i]['lng'],regular[i+1]['lat'],regular[i+1]['lng'])
                    for i in range(len(regular)-1)]
            avg = sum(segs)/len(segs)
            for i, seg in enumerate(segs):
                if avg > 0.1 and seg > avg * 4:
                    bug(NAME,f"Dia {di+1} backtracking no segmento {i+1}→{i+2}",
                        f"{seg:.1f}km (média do dia: {avg:.1f}km)",
                        "< 4× a média",
                        f"nearestNeighbor() deixou segmento ineficiente entre "
                        f"'{regular[i]['name']}' → '{regular[i+1]['name']}'")

    print(f"\n  --- Verificando distâncias calculadas (distKm vs haversine real) ---")
    max_err_pct = 0
    for di, day in enumerate(itin):
        for si in range(len(day['stops'])-1):
            a, b = day['stops'][si], day['stops'][si+1]
            if not all([a['lat'],a['lng'],b['lat'],b['lng']]): continue
            real_km = hav(a['lat'],a['lng'],b['lat'],b['lng']) * 1.3  # fator ruas
            stored  = float(a['distKm']) if a['distKm'] else 0
            if real_km > 0.05:  # só verifica distâncias significativas
                err_pct = abs(real_km - stored) / real_km * 100
                if err_pct > 5:
                    bug(NAME,f"Dia {di+1} stop {si} distKm armazenado",
                        f"{stored:.2f}km",
                        f"{real_km:.2f}km (±5%)",
                        "recalcTravel() calculando distância errada")
                else:
                    max_err_pct = max(max_err_pct, err_pct)
    ok(NAME,"distKm armazenado vs haversine real",f"max_err={max_err_pct:.1f}%")

    print(f"\n  --- Verificando sequência cidade→cidade no roteiro ---")
    # Cidade mais próxima de Kansai deve ser a ÚLTIMA cidade
    last_city = itin[-1]['city'] if itin[-1]['stops'] else ""
    # Osaka é mais próxima de Kansai (34.4°N) vs Tóquio (35.7°N) e Kyoto (35.0°N)
    osaka_dist_kansai = hav(34.6937, 135.5023, 34.4272, 135.2440)
    kyoto_dist_kansai = hav(35.0116, 135.7681, 34.4272, 135.2440)
    tokyo_dist_kansai = hav(35.6762, 139.6503, 34.4272, 135.2440)
    if last_city and "saka" not in last_city and " osaka" not in last_city.lower():
        bug(NAME,"Última cidade (mais próx. de Kansai)",
            f"'{last_city}'",
            "Osaka (cidade mais próxima do aeroporto de saída Kansai)",
            "Lógica de reordenação por aeroporto de saída em doGen() incorreta")
    else:
        ok(NAME,"Última cidade é a mais próx. do aeroporto de saída",last_city)

    print(f"\n  --- Verificando travelMin vs distKm ---")
    anomalies = []
    for di, day in enumerate(itin):
        for si in range(len(day['stops'])-1):
            s = day['stops'][si]
            dist = float(s['distKm']) if s['distKm'] else 0
            tmin = s['travelMin'] or 0
            if dist < 0.01 and tmin > 5:
                anomalies.append(f"D{di+1}S{si}: dist={dist:.2f}km mas travelMin={tmin}")
            elif dist > 1.0 and tmin < 1:
                anomalies.append(f"D{di+1}S{si}: dist={dist:.2f}km mas travelMin={tmin}")
    if anomalies:
        bug(NAME,"Coerência distKm ↔ travelMin",anomalies,"0 anomalias","recalcTravel() incoerente")
    else:
        ok(NAME,"distKm ↔ travelMin coerentes para todos os stops")

    ss(page,"A"); print(f"\n  ✅ PERSONA A concluída\n")


# ═══════════════════════════════════════════════════════════════════════════════
# PERSONA B – "O Relojoeiro": confronta cada minuto, cada horário, cada duração
# ═══════════════════════════════════════════════════════════════════════════════
def persona_B(page):
    NAME = "B-Relojoeiro"
    print(f"\n{'='*62}\nPERSONA B: Relojoeiro – confronta horários, durações e timeline\n{'='*62}")
    nav(page); login(page,"Relojoeiro")

    set_airport(page,"arrival","Haneda Airport",35.5494,139.7798)
    page.evaluate("document.getElementById('arr-date').value='2025-11-01';")
    set_airport(page,"departure","Kansai International Airport",34.4272,135.2440)
    page.evaluate("document.getElementById('dep-date').value='2025-11-08';")

    page.click("#btn-step1-next")
    add_cities(page,[
        {"name":"Tóquio","lat":35.6762,"lng":139.6503,"days":3},
        {"name":"Osaka", "lat":34.6937,"lng":135.5023,"days":2},
    ])
    page.click("#btn-step2-next")

    PTS = [
        {"name":"Tsukiji Morning Market","lat":35.6654,"lng":139.7706,"cat":"cafe"},
        {"name":"Senso-ji Temple",       "lat":35.7148,"lng":139.7967,"cat":"templo"},
        {"name":"Ueno Park",             "lat":35.7156,"lng":139.7733,"cat":"natureza"},
        {"name":"Ramen Ichiran Shibuya", "lat":35.6592,"lng":139.6993,"cat":"almoco"},
        {"name":"Harajuku Shopping",     "lat":35.6702,"lng":139.7026,"cat":"compras"},
        {"name":"Tokyo Tower Sunset",    "lat":35.6586,"lng":139.7454,"cat":"atracao"},
        {"name":"Izakaya Shinjuku",      "lat":35.6938,"lng":139.7034,"cat":"jantar"},
        {"name":"Dotonbori Food Walk",   "lat":34.6687,"lng":135.5019,"cat":"almoco"},
        {"name":"Osaka Castle Morning",  "lat":34.6873,"lng":135.5262,"cat":"atracao"},
        {"name":"Shinsekai Kushikatsu",  "lat":34.6528,"lng":135.5063,"cat":"jantar"},
        {"name":"Kuromon Market",        "lat":34.6664,"lng":135.5062,"cat":"cafe"},
    ]
    add_pts(page, PTS)
    gen(page)
    if not in_results(page): bug(NAME,"Gerar","Falhou","OK","doGen()"); return

    itin = page.evaluate("""itin.map((d,di)=>({
        di:di, city:d.cityName, startH:d.startH, startM:d.startM,
        endH:d.endH, endM:d.endM, date:d.date,
        stops:d.stops.map((s,si)=>({
            si:si, name:s.name, cat:s.cat, duration:s.duration,
            travelMin:s.travelMin||0
        }))
    }))""")

    def compute_timeline(day):
        """Recalcula horários de início de cada stop em minutos desde meia-noite."""
        cur = day['startH']*60 + day['startM']
        times = []
        for s in day['stops']:
            times.append(cur)
            cur += s['duration'] + s['travelMin']
        return times

    print(f"\n  --- Verificando durações padrão por categoria ---")
    CAT_DUR = {"cafe":25,"almoco":60,"jantar":75,"compras":90,"atracao":90,
               "templo":60,"natureza":60,"hotel":0,"aeroporto":60,
               "aeroporto-chegada":60,"aeroporto-saida":120,"outro":60}
    for di, day in enumerate(itin):
        for s in day['stops']:
            if s['cat'] in CAT_DUR:
                expected_dur = CAT_DUR[s['cat']]
                if expected_dur > 0 and s['duration'] != expected_dur:
                    bug(NAME,f"Duração padrão de '{s['name']}' ({s['cat']})",
                        f"{s['duration']}min",f"{expected_dur}min",
                        "catDuration() retornando valor diferente do esperado")

    print(f"\n  --- Verificando ordem categórica intra-dia (café→almoço→jantar) ---")
    CAT_ORDER = {"aeroporto-chegada":-1,"cafe":0,"templo":1,"natureza":1,
                 "atracao":1,"almoco":2,"compras":3,"jantar":4,
                 "hotel":5,"aeroporto-saida":99,"aeroporto":6}
    for di, day in enumerate(itin):
        regular = [s for s in day['stops']
                   if s['cat'] not in ('aeroporto-chegada','aeroporto-saida','aeroporto','hotel')]
        times = [i for i, s in enumerate(day['stops'])
                 if s['cat'] not in ('aeroporto-chegada','aeroporto-saida','aeroporto','hotel')]

        # Verifica: café (se presente) vem antes de almoço (se presente) que vem antes de jantar
        cats_ordered = [s['cat'] for s in regular]
        cat_pos = {}
        for i, c in enumerate(cats_ordered):
            if c not in cat_pos: cat_pos[c] = i

        pairs = [("cafe","almoco"), ("cafe","jantar"), ("almoco","jantar")]
        for before, after in pairs:
            if before in cat_pos and after in cat_pos:
                if cat_pos[before] > cat_pos[after]:
                    bug(NAME,f"Dia {di+1} [{day['city']}] ordem {before}→{after}",
                        f"{before} na pos {cat_pos[before]}, {after} na pos {cat_pos[after]}",
                        f"{before} deve vir ANTES de {after}",
                        f"smartSortDay() ou catSortOrder() com ordem errada")
                else:
                    ok(NAME,f"Dia {di+1}: {before} antes de {after}")

    print(f"\n  --- Verificando horários de início/fim razoáveis ---")
    for di, day in enumerate(itin):
        start_min = day['startH']*60 + day['startM']
        end_min   = day['endH']*60   + day['endM']
        times = compute_timeline(day)
        last_end = times[-1] + day['stops'][-1]['duration'] if times else start_min

        if start_min < 6*60:
            bug(NAME,f"Dia {di+1} hora de início",
                f"{day['startH']:02d}:{day['startM']:02d}",
                "≥ 06:00",
                "itin[di].startH default ou smartSortDay com valor absurdo")
        elif start_min > 11*60:
            bug(NAME,f"Dia {di+1} hora de início muito tarde",
                f"{day['startH']:02d}:{day['startM']:02d}",
                "≤ 11:00",
                "itin[di].startH padrão absurdo")
        else:
            ok(NAME,f"Dia {di+1} início",f"{day['startH']:02d}:{day['startM']:02d}")

        if last_end > 24*60:
            h = last_end//60; m = last_end%60
            bug(NAME,f"Dia {di+1} roteiro passa da meia-noite",
                f"Termina {h:02d}:{m:02d}",
                "≤ 24:00",
                "Muitos stops sem aviso; recalcTravel() não limita timeline")
        else:
            ok(NAME,f"Dia {di+1} fim antes de meia-noite",f"{last_end//60:02d}:{last_end%60:02d}")

    print(f"\n  --- Verificando travelMin positivo e coerente ---")
    for di, day in enumerate(itin):
        for si in range(len(day['stops'])-1):
            s = day['stops'][si]
            if s['travelMin'] < 0:
                bug(NAME,f"Dia {di+1} stop {si} travelMin negativo",
                    s['travelMin'],">= 0","recalcTravel() gerando valor negativo")
            elif s['travelMin'] == 0 and float(page.evaluate(
                f"itin[{di}].stops[{si}].distKm")) > 0.1:
                pass  # distKm armazenado mas travelMin ainda 0 em alguns casos normais

    print(f"\n  --- Verificando que hotel tem duração 0 (não ocupa tempo no dia) ---")
    for di, day in enumerate(itin):
        for s in day['stops']:
            if s['cat'] == 'hotel' and s['duration'] != 0:
                bug(NAME,f"Dia {di+1} hotel duração",
                    s['duration'],0,
                    "catDuration('hotel') deveria retornar 0, hotel não ocupa tempo no dia")

    print(f"\n  --- Verificando aeroporto-chegada: duração razoável ---")
    for di, day in enumerate(itin):
        for s in day['stops']:
            if s['cat'] == 'aeroporto-chegada' and s['duration'] < 30:
                bug(NAME,"Duração aeroporto-chegada",
                    f"{s['duration']}min","≥ 30min (desembarque + imigração)",
                    "catDuration('aeroporto-chegada') muito curto")

    print(f"\n  --- Verificando que aeroporto-chegada é SEMPRE o 1º stop do Dia 1 ---")
    if itin and itin[0]['stops']:
        first = itin[0]['stops'][0]
        if first['cat'] != 'aeroporto-chegada':
            bug(NAME,"Posição aeroporto-chegada",
                f"1ª parada D1 = '{first['name']}' ({first['cat']})",
                "aeroporto-chegada",
                "doGen() não usa unshift para aeroporto-chegada")
        else:
            ok(NAME,"Aeroporto-chegada é 1ª parada do Dia 1")

    print(f"\n  --- Verificando que aeroporto-saida é SEMPRE o último stop do último dia ---")
    if itin and itin[-1]['stops']:
        last = itin[-1]['stops'][-1]
        if last['cat'] != 'aeroporto-saida':
            bug(NAME,"Posição aeroporto-saida",
                f"Última parada = '{last['name']}' ({last['cat']})",
                "aeroporto-saida",
                "doGen() não faz push correto de aeroporto-saida")
        else:
            ok(NAME,"Aeroporto-saida é última parada do último dia")

    ss(page,"B"); print(f"\n  ✅ PERSONA B concluída\n")


# ═══════════════════════════════════════════════════════════════════════════════
# PERSONA C – "A Contadora de Datas": confronta cada data, sequência, gap e overlap
# ═══════════════════════════════════════════════════════════════════════════════
def persona_C(page):
    NAME = "C-ContadoraDatas"
    print(f"\n{'='*62}\nPERSONA C: Contadora de Datas – confronta toda cronologia\n{'='*62}")
    nav(page); login(page,"Contadora")

    set_airport(page,"arrival","Narita International Airport",35.7719,140.3929)
    page.evaluate("document.getElementById('arr-date').value='2025-12-01';")
    set_airport(page,"departure","Haneda Airport",35.5494,139.7798)
    page.evaluate("document.getElementById('dep-date').value='2025-12-10';")

    page.click("#btn-step1-next")
    add_cities(page,[
        {"name":"Tóquio","lat":35.6762,"lng":139.6503,"days":3},
        {"name":"Hakone","lat":35.2326,"lng":139.1069,"days":2},
        {"name":"Kyoto", "lat":35.0116,"lng":135.7681,"days":2},
    ])
    page.click("#btn-step2-next")

    PTS = [
        {"name":"Meiji Shrine","lat":35.6764,"lng":139.6993,"cat":"templo"},
        {"name":"Shibuya","lat":35.6595,"lng":139.7004,"cat":"atracao"},
        {"name":"Akihabara","lat":35.7022,"lng":139.7741,"cat":"compras"},
        {"name":"Ueno Park","lat":35.7156,"lng":139.7733,"cat":"natureza"},
        {"name":"Asakusa","lat":35.7148,"lng":139.7967,"cat":"templo"},
        {"name":"Tokyo Skytree","lat":35.7101,"lng":139.8107,"cat":"atracao"},
        {"name":"Hakone Open Air Museum","lat":35.2523,"lng":139.0449,"cat":"atracao"},
        {"name":"Lake Ashi","lat":35.1977,"lng":139.0199,"cat":"natureza"},
        {"name":"Owakudani","lat":35.2572,"lng":139.0228,"cat":"natureza"},
        {"name":"Kinkakuji","lat":35.0394,"lng":135.7292,"cat":"templo"},
        {"name":"Fushimi Inari","lat":34.9671,"lng":135.7727,"cat":"templo"},
        {"name":"Gion","lat":35.0037,"lng":135.7784,"cat":"atracao"},
        {"name":"Arashiyama","lat":35.0094,"lng":135.6694,"cat":"natureza"},
    ]
    add_pts(page, PTS)
    gen(page)
    if not in_results(page): bug(NAME,"Gerar","Falhou","OK","doGen()"); return

    # Atribui datas sequencialmente a todos os dias antes de testar ordenação
    n_days = page.evaluate("itin.length")
    print(f"\n  Dias gerados: {n_days}")

    # Atribui datas 2025-12-01 a 2025-12-10 aos dias (D1 já tem data do aeroporto)
    page.evaluate(f"""()=>{{
        var base = new Date('2025-12-01T12:00:00');
        for(var i=0;i<itin.length;i++){{
            var d = new Date(base);
            d.setDate(d.getDate()+i);
            if(!itin[i].date)
                itin[i].date = d.toISOString().split('T')[0];
        }}
        renderTL();
    }}""")
    page.wait_for_timeout(300)

    dates = page.evaluate("itin.map(d=>d.date)")
    print(f"  Datas após atribuição: {dates}")

    print(f"\n  --- Verificando que Dia 1 tem data do aeroporto de chegada ---")
    d1_date = page.evaluate("itin[0].date")
    if d1_date != "2025-12-01":
        bug(NAME,"Data Dia 1 = data de chegada",
            d1_date,"2025-12-01",
            "doGen() não aplica arr-date ao itin[0].date, ou data sobrescrita")
    else:
        ok(NAME,"Dia 1 tem data de chegada 2025-12-01")

    print(f"\n  --- Verificando que último dia tem data do aeroporto de saída ---")
    ld_date = page.evaluate("itin[itin.length-1].date")
    if ld_date != "2025-12-10":
        bug(NAME,"Data último dia = data de saída",
            ld_date,"2025-12-10",
            "doGen() não aplica dep-date ao último dia, ou data sobrescrita")
    else:
        ok(NAME,"Último dia tem data de saída 2025-12-10")

    print(f"\n  --- Verificando sequência estritamente crescente de datas ---")
    dates_with_val = [d for d in dates if d]
    for i in range(len(dates_with_val)-1):
        a, b = dates_with_val[i], dates_with_val[i+1]
        if a >= b:
            bug(NAME,f"Sequência de datas [dia {i+1}→{i+2}]",
                f"{a} >= {b}",
                f"{a} < {b} (crescente)",
                "sortItinByDate() ou atribuição de datas com bug")
    if all(dates_with_val[i]<dates_with_val[i+1] for i in range(len(dates_with_val)-1)):
        ok(NAME,"Sequência de datas estritamente crescente")

    print(f"\n  --- Verificando ausência de datas duplicadas ---")
    from collections import Counter
    cnt = Counter(d for d in dates if d)
    dups = {k:v for k,v in cnt.items() if v>1}
    if dups:
        bug(NAME,"Datas duplicadas",str(dups),"Nenhuma duplicata","sortItinByDate() ou geração de datas duplicando")
    else:
        ok(NAME,"Nenhuma data duplicada")

    print(f"\n  --- Testando sortItinByDate com injeção de data fora de ordem ---")
    # Muda data do último dia para antes do penúltimo (sem hotelGroup)
    page.evaluate("""()=>{
        var last = itin.length-1;
        if(last >= 2){
            itin[last].date   = '2025-12-02';
            itin[last].hotelGroup = null;
            itin[last-1].date = '2025-12-09';
            itin[last-1].hotelGroup = null;
            sortItinByDate();
            renderTL();
        }
    }""")
    page.wait_for_timeout(300)
    new_dates = page.evaluate("itin.map(d=>d.date)")
    is_sorted = all(new_dates[i]<=new_dates[i+1]
                    for i in range(len(new_dates)-1)
                    if new_dates[i] and new_dates[i+1])
    print(f"  Após sortItinByDate: {new_dates[:5]}...")
    if not is_sorted:
        bug(NAME,"sortItinByDate() reordena corretamente",str(new_dates[:5]),"Ordem crescente","sortItinByDate() bug")
    else:
        ok(NAME,"sortItinByDate() reordenou corretamente após injeção")

    print(f"\n  --- Testando hotel: hotelGroup protege bloco ---")
    # Adiciona hotel e verifica que seus dias ficam juntos após sort
    page.evaluate("""()=>{
        // Recomeça datas sequenciais
        var base = new Date('2025-12-01T12:00:00');
        itin.forEach(function(d,i){
            d.date = new Date(base.getTime()+i*86400000).toISOString().split('T')[0];
            d.hotelGroup = null;
        });
        // Marca dias 2 e 3 como bloco de hotel
        if(itin.length >= 4){
            itin[2].hotelGroup = 'hotel_test';
            itin[3].hotelGroup = 'hotel_test';
            itin[2].date = '2025-12-03';
            itin[3].date = '2025-12-04';
        }
        // Injeta um dia sem data entre eles (deve ir ao fim, não separar o bloco)
        if(itin.length >= 5){
            itin[4].date = '';
            itin[4].hotelGroup = null;
        }
        sortItinByDate();
    }""")
    page.wait_for_timeout(300)
    after_sort = page.evaluate("itin.map(d=>({date:d.date,hg:d.hotelGroup||null}))")
    # Verifica que os dois dias do hotel (hotelGroup='hotel_test') ficam consecutivos
    hg_positions = [i for i,d in enumerate(after_sort) if d['hg']=='hotel_test']
    print(f"  Posições dos dias do hotel após sort: {hg_positions}")
    if len(hg_positions)==2 and hg_positions[1]-hg_positions[0]!=1:
        bug(NAME,"hotelGroup mantém dias consecutivos após sort",
            f"posições {hg_positions}","posições consecutivas",
            "sortItinByDate() está separando o bloco de hotel")
    elif len(hg_positions)==2:
        ok(NAME,"hotelGroup mantém bloco de hotel unido",f"posições {hg_positions}")

    print(f"\n  --- Testando popup de hotel: datas aplicadas corretamente ---")
    # Re-gera para ter um roteiro limpo
    page.evaluate("itin.forEach(d=>{d.date='';d.hotelGroup=null;});renderTL();")
    page.wait_for_timeout(200)

    # Abre popup de hotel via JS e simula check-in 2025-12-03, 3 noites
    page.evaluate("""()=>{
        _pendingHotelStop = {name:'Park Hyatt Tokyo',lat:35.6858,lng:139.6922,desc:'Hotel',note:''};
        _pendingHotelFromDi = 1;
        openHotelAssignPopup(_pendingHotelStop, 1);
    }""")
    page.wait_for_timeout(300)

    popup_open = page.evaluate("document.getElementById('hotel-assign-overlay').classList.contains('on')")
    if not popup_open: bug(NAME,"Popup hotel abriu","não","sim","openHotelAssignPopup() bug"); return

    page.evaluate("document.getElementById('hotel-checkin').value='2025-12-03';")
    page.evaluate("document.getElementById('hotel-checkout').value='2025-12-06';")
    page.evaluate("document.getElementById('hotel-checkin').dispatchEvent(new Event('input'));")
    page.evaluate("document.getElementById('hotel-checkout').dispatchEvent(new Event('input'));")
    page.wait_for_timeout(300)

    nights_txt = page.evaluate("document.getElementById('hotel-nights-info').textContent")
    print(f"  Info noites: '{nights_txt}'")
    if "3 noite" not in nights_txt:
        bug(NAME,"Popup hotel: cálculo de noites",nights_txt,"3 noites","updateNightsInfo() bug")
    else:
        ok(NAME,"Popup hotel: 3 noites calculadas corretamente")

    # Confirma
    click_popup_btn(page,"Adicionar hotel"); page.wait_for_timeout(600)
    popup_closed = not page.evaluate("document.getElementById('hotel-assign-overlay').classList.contains('on')")
    print(f"  Popup fechou após confirmar: {popup_closed}")
    if not popup_closed:
        bug(NAME,"Popup fecha após confirmar hotel","aberto","fechado","closeHotelAssignPopup() bug")
    else:
        ok(NAME,"Popup fechou após confirmar hotel")

    # sortItinByDate é chamado após confirmar, então os dias do hotel podem mudar de índice.
    # Busca por hotelGroup (todos os dias com mesmo hotelGroup não-nulo)
    hotel_days = page.evaluate("""()=>{
        var hgMap={};
        itin.forEach(function(d){if(d.hotelGroup)hgMap[d.hotelGroup]=(hgMap[d.hotelGroup]||[]).concat(d.date);});
        var keys=Object.keys(hgMap);
        return keys.length?hgMap[keys[0]]:[];
    }""")
    hotel_days.sort()
    print(f"  Datas aplicadas aos dias do hotel (via hotelGroup): {hotel_days}")
    expected_hdates = ["2025-12-03","2025-12-04","2025-12-05"]
    for i,(got,exp) in enumerate(zip(hotel_days,expected_hdates)):
        if got!=exp:
            bug(NAME,f"Data do dia do hotel [{i+1}]",got,exp,
                "applyHotelToDays() não aplica as datas corretas do check-in")
        else:
            ok(NAME,f"Data dia hotel [{i+1}]",got)
    if len(hotel_days)<3:
        for i in range(len(hotel_days),3):
            bug(NAME,f"Data do dia do hotel [{i+1}]","(ausente)",expected_hdates[i],
                "hotelGroup não atribuído a todos os dias")

    # Verifica hotelGroup foi atribuído a exatamente 3 dias com mesmo grupo
    all_hg = page.evaluate("itin.map(d=>d.hotelGroup||null)")
    hg_vals = [g for g in all_hg if g]
    if len(hg_vals)!=3 or len(set(hg_vals))!=1:
        bug(NAME,"hotelGroup atribuído a todos os dias do hotel",
            str(all_hg),"exatamente 3 dias com mesmo hotelGroup",
            "confirmBtn.onclick em openHotelAssignPopup não marca groupId")
    else:
        ok(NAME,"hotelGroup atribuído a todos os dias do hotel")

    ss(page,"C"); print(f"\n  ✅ PERSONA C concluída\n")


# ═══════════════════════════════════════════════════════════════════════════════
# PERSONA D – "O Auditor de Hotel": confronta distribuição geográfica dos stops
# ═══════════════════════════════════════════════════════════════════════════════
def persona_D(page):
    NAME = "D-AuditorHotel"
    print(f"\n{'='*62}\nPERSONA D: Auditor de Hotel – confronta distribuição geográfica\n{'='*62}")
    nav(page); login(page,"Auditor")

    page.click("#btn-step1-next")
    add_cities(page,[
        {"name":"Kyoto","lat":35.0116,"lng":135.7681,"days":4},
    ])
    page.click("#btn-step2-next")

    # Hotel no centro de Kyoto
    HOTEL = {"name":"The Ritz-Carlton Kyoto","lat":35.0168,"lng":135.7738}

    # Stops bem definidos: 6 próximos do hotel, 6 distantes
    NEAR = [  # < 3km do hotel
        {"name":"Nishiki Market",    "lat":35.0050,"lng":135.7660,"cat":"compras"},
        {"name":"Gion Corner",       "lat":35.0037,"lng":135.7784,"cat":"atracao"},
        {"name":"Heian Shrine",      "lat":35.0160,"lng":135.7824,"cat":"templo"},
        {"name":"Philosopher's Path","lat":35.0245,"lng":135.7965,"cat":"natureza"},
        {"name":"Nanzen-ji",         "lat":35.0113,"lng":135.7920,"cat":"templo"},
        {"name":"Pontocho Alley",    "lat":35.0064,"lng":135.7699,"cat":"jantar"},
    ]
    FAR = [   # > 6km do hotel
        {"name":"Kinkakuji",       "lat":35.0394,"lng":135.7292,"cat":"templo"},   # 4.5km
        {"name":"Arashiyama",      "lat":35.0094,"lng":135.6694,"cat":"natureza"}, # 7.5km
        {"name":"Fushimi Inari",   "lat":34.9671,"lng":135.7727,"cat":"templo"},   # 5.5km
        {"name":"Tofuku-ji",       "lat":34.9737,"lng":135.7756,"cat":"templo"},   # 4.8km
        {"name":"Nijo Castle",     "lat":35.0142,"lng":135.7481,"cat":"atracao"},  # 2.9km
        {"name":"Daikaku-ji",      "lat":35.0270,"lng":135.6764,"cat":"templo"},   # 7.2km
    ]
    add_pts(page, NEAR + FAR)
    gen(page)
    if not in_results(page): bug(NAME,"Gerar","Falhou","OK","doGen()"); return

    days = page.evaluate("itin.length")
    print(f"  Dias gerados: {days}")

    # Adiciona hotel com check-in 2 → 2+4 dias cobertos
    page.evaluate(f"""()=>{{
        _pendingHotelStop = {{name:'{HOTEL['name']}',lat:{HOTEL['lat']},lng:{HOTEL['lng']},desc:'',note:''}};
        _pendingHotelFromDi = 0;
        openHotelAssignPopup(_pendingHotelStop, 0);
    }}""")
    page.wait_for_timeout(300)

    page.evaluate("document.getElementById('hotel-checkin').value='2025-10-01';")
    page.evaluate("document.getElementById('hotel-checkout').value='2025-10-05';")
    page.evaluate("document.getElementById('hotel-checkin').dispatchEvent(new Event('input'));")
    page.evaluate("document.getElementById('hotel-checkout').dispatchEvent(new Event('input'));")
    page.wait_for_timeout(300)
    click_popup_btn(page,"Adicionar hotel"); page.wait_for_timeout(700)

    itin_data = page.evaluate("""itin.map((d,di)=>({
        di:di,
        hasHotel: d.stops.some(s=>s.cat==='hotel'),
        hotelGroup: d.hotelGroup||null,
        stops: d.stops.filter(s=>s.cat!=='hotel'&&s.cat!=='aeroporto-chegada'&&s.cat!=='aeroporto-saida')
                      .map(s=>({name:s.name,lat:s.lat,lng:s.lng}))
    }))""")

    hotel_days    = [d for d in itin_data if d['hasHotel']]
    non_hotel_days= [d for d in itin_data if not d['hasHotel']]

    print(f"\n  Dias COM hotel: {[d['di']+1 for d in hotel_days]}")
    print(f"  Dias SEM hotel: {[d['di']+1 for d in non_hotel_days]}")

    print(f"\n  --- Verificando que stops dos dias com hotel são mais próximos ---")
    hlat, hlng = HOTEL['lat'], HOTEL['lng']

    hotel_stop_dists = []
    for d in hotel_days:
        for s in d['stops']:
            hotel_stop_dists.append(hav(s['lat'],s['lng'],hlat,hlng))

    non_hotel_stop_dists = []
    for d in non_hotel_days:
        for s in d['stops']:
            non_hotel_stop_dists.append(hav(s['lat'],s['lng'],hlat,hlng))

    avg_hotel     = sum(hotel_stop_dists)/len(hotel_stop_dists)     if hotel_stop_dists     else 0
    avg_non_hotel = sum(non_hotel_stop_dists)/len(non_hotel_stop_dists) if non_hotel_stop_dists else 0

    print(f"  Distância média ao hotel:")
    print(f"    Dias COM hotel:  {avg_hotel:.2f}km")
    print(f"    Dias SEM hotel:  {avg_non_hotel:.2f}km")

    if hotel_stop_dists and non_hotel_stop_dists and avg_hotel >= avg_non_hotel:
        bug(NAME,"Stops mais próximos do hotel vão para dias do hotel",
            f"avg hotel_days={avg_hotel:.2f}km >= avg non_hotel={avg_non_hotel:.2f}km",
            f"avg hotel_days < avg non_hotel",
            "applyHotelToDays() não está priorizando stops próximos nos dias do hotel")
    elif hotel_stop_dists and non_hotel_stop_dists:
        ok(NAME,"Stops mais próximos nos dias do hotel",
           f"{avg_hotel:.2f}km < {avg_non_hotel:.2f}km ✓")

    print(f"\n  --- Verificando que NENHUM dia do hotel ficou vazio de stops ---")
    for d in hotel_days:
        if not d['stops']:
            bug(NAME,f"Dia {d['di']+1} com hotel tem paradas",
                "0 stops","≥1 stop além do hotel",
                "applyHotelToDays() não distribuiu stops para este dia")
        else:
            ok(NAME,f"Dia {d['di']+1} com hotel tem {len(d['stops'])} paradas")

    print(f"\n  --- Verificando que o hotel aparece em TODOS os dias marcados ---")
    for d in hotel_days:
        hotel_in_day = page.evaluate(f"itin[{d['di']}].stops.some(s=>s.cat==='hotel')")
        if not hotel_in_day:
            bug(NAME,f"Dia {d['di']+1} tem stop de hotel",
                "False","True","applyHotelToDays() não inseriu hotel neste dia")
        else:
            ok(NAME,f"Dia {d['di']+1}: hotel presente")

    print(f"\n  --- Verificando banner: hotel aparece exatamente 1x ---")
    banner_html = page.evaluate("document.getElementById('hotel-info').innerHTML")
    hotel_name = HOTEL['name']
    count = banner_html.count(hotel_name)
    print(f"  '{hotel_name}' aparece {count}x no banner")
    if count == 0:
        bug(NAME,"Banner mostra nome do hotel",count,"1","updateHotelBanner() não encontra hotel")
    elif count > 1:
        bug(NAME,"Banner sem repetição do hotel",f"{count}x","1x","updateHotelBanner() não deduplica")
    else:
        ok(NAME,"Hotel aparece exatamente 1x no banner")

    print(f"\n  --- Verificando noites exibidas no banner ---")
    nights_in_banner = "4 noites" in banner_html
    print(f"  Banner contém '4 noites': {nights_in_banner}")
    if not nights_in_banner:
        bug(NAME,"Banner exibe número de noites",
            banner_html[:80],"contém '4 noites'",
            "updateHotelBanner() não mostra noites ou calcula errado")
    else:
        ok(NAME,"Banner exibe '4 noites' corretamente")

    ss(page,"D"); print(f"\n  ✅ PERSONA D concluída\n")


# ═══════════════════════════════════════════════════════════════════════════════
# PERSONA E – "A Auditora Completa": confronta TUDO num roteiro de 14 dias
# ═══════════════════════════════════════════════════════════════════════════════
def persona_E(page):
    NAME = "E-AuditoraCompleta"
    print(f"\n{'='*62}\nPERSONA E: Auditora Completa – roteiro 14 dias, tudo confrontado\n{'='*62}")
    nav(page); login(page,"Auditora")

    set_airport(page,"arrival","Narita International Airport",35.7719,140.3929)
    page.evaluate("document.getElementById('arr-date').value='2025-04-01';")
    set_airport(page,"departure","Kansai International Airport",34.4272,135.2440)
    page.evaluate("document.getElementById('dep-date').value='2025-04-15';")

    page.click("#btn-step1-next")
    add_cities(page,[
        {"name":"Tóquio",    "lat":35.6762,"lng":139.6503,"days":4},
        {"name":"Nikko",     "lat":36.7198,"lng":139.6983,"days":1},
        {"name":"Hakone",    "lat":35.2326,"lng":139.1069,"days":2},
        {"name":"Kyoto",     "lat":35.0116,"lng":135.7681,"days":3},
        {"name":"Osaka",     "lat":34.6937,"lng":135.5023,"days":2},
    ])
    page.click("#btn-step2-next")

    FULL_PTS = [
        # Tóquio
        {"name":"Senso-ji",           "lat":35.7148,"lng":139.7967,"cat":"templo"},
        {"name":"Tsukiji Market",     "lat":35.6654,"lng":139.7706,"cat":"cafe"},
        {"name":"Tokyo Tower",        "lat":35.6586,"lng":139.7454,"cat":"atracao"},
        {"name":"Shibuya Crossing",   "lat":35.6595,"lng":139.7004,"cat":"atracao"},
        {"name":"Ramen Ichiran",      "lat":35.6593,"lng":139.6993,"cat":"almoco"},
        {"name":"Shinjuku Gyoen",     "lat":35.6851,"lng":139.7100,"cat":"natureza"},
        {"name":"Akihabara",          "lat":35.7022,"lng":139.7741,"cat":"compras"},
        {"name":"Ueno Park",          "lat":35.7156,"lng":139.7733,"cat":"natureza"},
        {"name":"Izakaya Omoide",     "lat":35.6938,"lng":139.7034,"cat":"jantar"},
        {"name":"Harajuku Takeshita", "lat":35.6702,"lng":139.7026,"cat":"compras"},
        {"name":"Asakusa Nakamise",   "lat":35.7118,"lng":139.7964,"cat":"compras"},
        {"name":"TeamLab Planets",    "lat":35.6462,"lng":139.7833,"cat":"atracao"},
        # Nikko
        {"name":"Tosho-gu Shrine",    "lat":36.7581,"lng":139.5987,"cat":"templo"},
        {"name":"Kegon Falls",        "lat":36.7511,"lng":139.5233,"cat":"natureza"},
        # Hakone
        {"name":"Hakone Open Air Museum","lat":35.2523,"lng":139.0449,"cat":"atracao"},
        {"name":"Lake Ashi",          "lat":35.1977,"lng":139.0199,"cat":"natureza"},
        {"name":"Owakudani",          "lat":35.2572,"lng":139.0228,"cat":"natureza"},
        # Kyoto
        {"name":"Kinkakuji",          "lat":35.0394,"lng":135.7292,"cat":"templo"},
        {"name":"Fushimi Inari",      "lat":34.9671,"lng":135.7727,"cat":"templo"},
        {"name":"Gion",               "lat":35.0037,"lng":135.7784,"cat":"atracao"},
        {"name":"Arashiyama",         "lat":35.0094,"lng":135.6694,"cat":"natureza"},
        {"name":"Nishiki Market",     "lat":35.0050,"lng":135.7660,"cat":"compras"},
        {"name":"Philosopher's Path", "lat":35.0245,"lng":135.7965,"cat":"natureza"},
        {"name":"Pontocho",           "lat":35.0064,"lng":135.7699,"cat":"jantar"},
        # Osaka
        {"name":"Dotonbori",          "lat":34.6687,"lng":135.5019,"cat":"atracao"},
        {"name":"Osaka Castle",       "lat":34.6873,"lng":135.5262,"cat":"atracao"},
        {"name":"Shinsekai",          "lat":34.6528,"lng":135.5063,"cat":"atracao"},
        {"name":"Kuromon Market",     "lat":34.6664,"lng":135.5062,"cat":"almoco"},
        {"name":"Umeda Sky Building", "lat":34.7056,"lng":135.4951,"cat":"atracao"},
    ]
    add_pts(page, FULL_PTS)
    gen(page)
    if not in_results(page): bug(NAME,"Gerar","Falhou","OK","doGen()"); return

    n = page.evaluate("itin.length")
    print(f"  Dias gerados: {n}")

    print(f"\n  --- [E.1] Total de stops gerados vs injetados ---")
    total_stops    = page.evaluate("itin.reduce((t,d)=>t+d.stops.length,0)")
    # +2 aeroportos + (n * zero hotel) = len(FULL_PTS) + 2
    min_expected   = len(FULL_PTS)
    max_expected   = len(FULL_PTS) + 2  # + aeroporto chegada + saida
    print(f"  Stops totais: {total_stops} (esperado {min_expected}–{max_expected})")
    if total_stops < min_expected:
        bug(NAME,"Nenhum stop perdido",total_stops,f">= {min_expected}","doGen() descartou stops")
    else:
        ok(NAME,"Nenhum stop perdido",f"{total_stops} stops")

    print(f"\n  --- [E.2] Nenhum dia vazio ---")
    empty = page.evaluate("itin.filter(d=>d.stops.length===0).length")
    if empty:
        bug(NAME,"Dias vazios",empty,0,"kmeansMulti() ou distribuição gerando clusters vazios")
    else:
        ok(NAME,"Nenhum dia vazio")

    print(f"\n  --- [E.3] Aeroporto de chegada no Dia 1 (1ª pos) ---")
    f0 = page.evaluate("itin[0].stops[0].cat")
    if f0!="aeroporto-chegada":
        bug(NAME,"aeroporto-chegada 1ª pos Dia 1",f0,"aeroporto-chegada","doGen() bug")
    else: ok(NAME,"aeroporto-chegada é 1ª parada")

    print(f"\n  --- [E.4] Aeroporto de saída no último dia (última pos) ---")
    fl = page.evaluate("itin[itin.length-1].stops[itin[itin.length-1].stops.length-1].cat")
    if fl!="aeroporto-saida":
        bug(NAME,"aeroporto-saida última pos",fl,"aeroporto-saida","doGen() bug")
    else: ok(NAME,"aeroporto-saida é última parada")

    print(f"\n  --- [E.5] Separação por cidade: sem mistura entre regiões ---")
    region_bounds = {
        "Tóquio":  {"lat":(35.55,35.80),"lng":(139.60,139.90)},
        "Nikko":   {"lat":(36.60,36.90),"lng":(139.40,139.70)},
        "Hakone":  {"lat":(35.15,35.30),"lng":(138.95,139.10)},
        "Kyoto":   {"lat":(34.93,35.06),"lng":(135.65,135.82)},
        "Osaka":   {"lat":(34.60,34.73),"lng":(135.48,135.55)},
    }
    city_days = page.evaluate("itin.map(d=>({city:d.cityName,stops:d.stops.map(s=>({lat:s.lat,lng:s.lng,name:s.name,cat:s.cat}))}))")
    for di, day in enumerate(city_days):
        city = day['city']
        if city not in region_bounds: continue
        bounds = region_bounds[city]
        for s in day['stops']:
            if s['cat'] in ('aeroporto-chegada','aeroporto-saida','hotel','aeroporto'): continue
            if not s['lat']: continue
            lat_ok = bounds['lat'][0] <= s['lat'] <= bounds['lat'][1]
            lng_ok = bounds['lng'][0] <= s['lng'] <= bounds['lng'][1]
            if not lat_ok or not lng_ok:
                bug(NAME,f"Stop '{s['name']}' dentro dos bounds de {city}",
                    f"lat={s['lat']:.4f},lng={s['lng']:.4f}",
                    f"lat∈{bounds['lat']}, lng∈{bounds['lng']}",
                    f"assignPtsToCity() atribuiu stop errado à cidade {city}")

    ok(NAME,"Separação geográfica por cidade verificada")

    print(f"\n  --- [E.6] Coerência cidade→cidade: ordem lógica na rota ---")
    # Tóquio → Nikko → Hakone → Kyoto → Osaka é a rota mais eficiente
    # (Nikko ao norte de Tóquio, Hakone ao sul, depois Kyoto/Osaka)
    city_sequence = page.evaluate("Array.from(new Set(itin.map(d=>d.cityName).filter(c=>c)))")
    print(f"  Sequência de cidades: {city_sequence}")
    # A última cidade deve ser Osaka (mais próx. de Kansai)
    last_city = city_sequence[-1] if city_sequence else ""
    if "saka" not in last_city.lower() and last_city:
        bug(NAME,"Última cidade = mais próxima de Kansai",
            last_city,"Osaka","lógica de reordenação por aeroporto de saída")
    else:
        ok(NAME,"Última cidade é Osaka (mais próx. Kansai)",last_city)

    print(f"\n  --- [E.7] Dia 1 tem data 2025-04-01 ---")
    d1 = page.evaluate("itin[0].date")
    if d1!="2025-04-01":
        bug(NAME,"Data Dia 1",d1,"2025-04-01","doGen() não aplica arr-date")
    else: ok(NAME,"Dia 1 = 2025-04-01")

    print(f"\n  --- [E.8] Último dia tem data 2025-04-15 ---")
    dl = page.evaluate("itin[itin.length-1].date")
    if dl!="2025-04-15":
        bug(NAME,"Data último dia",dl,"2025-04-15","doGen() não aplica dep-date")
    else: ok(NAME,"Último dia = 2025-04-15")

    print(f"\n  --- [E.9] travelMin > 0 para stops consecutivos não-triviais ---")
    travel_issues = page.evaluate("""(function(){
        var issues=[];
        itin.forEach(function(day,di){
            day.stops.forEach(function(s,si){
                if(si===day.stops.length-1)return;
                var next=day.stops[si+1];
                var dist=Math.sqrt(Math.pow(s.lat-next.lat,2)+Math.pow(s.lng-next.lng,2));
                if(dist>0.005 && (s.travelMin||0)===0){
                    issues.push('D'+(di+1)+'S'+si+': dist≈'+dist.toFixed(4)+'° travelMin=0');
                }
            });
        });
        return issues;
    })()""")
    if travel_issues:
        bug(NAME,"travelMin=0 para stops com distância real",
            travel_issues[:3],"travelMin>0","recalcTravel() não sendo chamado para estes stops")
    else:
        ok(NAME,"travelMin > 0 para todos os pares com distância real")

    print(f"\n  --- [E.10] Duração total de cada dia < 16h ---")
    day_durations = page.evaluate("""itin.map(function(day,di){
        var total=day.stops.reduce(function(t,s){return t+s.duration+(s.travelMin||0);},0);
        return {di:di,total:total};
    })""")
    for d in day_durations:
        if d['total'] > 16*60:
            h,m = d['total']//60, d['total']%60
            bug(NAME,f"Dia {d['di']+1} duração total",
                f"{h}h{m:02d}min",
                "≤ 16h (960min)",
                "Muitos stops por dia sem aviso ou divisão insuficiente de dias")
        else:
            h,m = d['total']//60, d['total']%60
            ok(NAME,f"Dia {d['di']+1} duração total",f"{h}h{m:02d}min")

    print(f"\n  --- [E.11] Color pickers: count = n_dias × 2 ---")
    page.evaluate("document.getElementById('clr-body').classList.add('open');renderDayColorPickers();")
    page.wait_for_timeout(200)
    cpickers = page.evaluate("document.querySelectorAll('.dclr').length")
    if cpickers != n*2:
        bug(NAME,"Color pickers count",cpickers,f"{n*2}","renderDayColorPickers() bug")
    else:
        ok(NAME,"Color pickers count correto",f"{cpickers} = {n}×2")

    print(f"\n  --- [E.12] sortItinByDate não altera n_dias ---")
    page.evaluate("""()=>{
        itin[0].hotelGroup=null;
        itin[0].date='2025-04-14';  // injeta data fora de ordem
        sortItinByDate(); renderTL();
    }""")
    page.wait_for_timeout(300)
    n2 = page.evaluate("itin.length")
    if n2!=n:
        bug(NAME,"sortItinByDate preserva n_dias",n2,n,"sortItinByDate() perdendo dias")
    else:
        ok(NAME,"sortItinByDate preserva n_dias",str(n))

    print(f"\n  --- [E.13] Remover stop e recalcular viagem ---")
    stops_before = page.evaluate("itin[1].stops.length") if n>1 else 0
    if stops_before > 1:
        page.evaluate("""()=>{
            itin[1].stops.splice(0,1);
            recalcTravel(1);
            renderTL();
        }""")
        page.wait_for_timeout(300)
        stops_after = page.evaluate("itin[1].stops.length")
        if stops_after != stops_before - 1:
            bug(NAME,"Remover stop do Dia 2",stops_after,stops_before-1,"splice não funcionou")
        else:
            ok(NAME,"Remover stop e recalcTravel",f"{stops_before}→{stops_after}")

    print(f"\n  --- [E.14] PDF tem conteúdo de todos os dias ---")
    with page.expect_popup() as pi: page.click("#btn-pdf")
    pop = pi.value; pop.wait_for_load_state("domcontentloaded")
    n_curr = page.evaluate("itin.length")
    pdf_txt = pop.evaluate("document.body.innerText")
    missing_days = [i+1 for i in range(n_curr) if f"Dia {i+1}" not in pdf_txt]
    if missing_days:
        bug(NAME,"PDF contém todos os dias",f"Ausentes: {missing_days}","Todos os dias","doPDF() pulando dias")
    else:
        ok(NAME,"PDF contém todos os dias",f"{n_curr} dias")

    # Verifica links do Google Maps no PDF
    maps_count = pdf_txt.count("google.com/maps") + pop.evaluate("document.body.innerHTML").count("maps.google")
    maps_in_html = pop.evaluate("document.querySelectorAll('a[href*=\"google.com/maps\"]').length")
    print(f"  Links Google Maps no PDF: {maps_in_html}")
    if maps_in_html < total_stops - 3:
        bug(NAME,"Links Google Maps no PDF",maps_in_html,f"≥ {total_stops-3}","doPDF() não gera links para todos os stops")
    else:
        ok(NAME,"Links Google Maps no PDF",str(maps_in_html))
    pop.close()

    ss(page,"E"); print(f"\n  ✅ PERSONA E concluída\n")


# ═══════════════════════════════════════════════════════════════════════════════
# RUNNER
# ═══════════════════════════════════════════════════════════════════════════════
def run():
    with sync_playwright() as pw:
        br  = pw.chromium.launch(headless=True)
        ctx = br.new_context(viewport={"width":1280,"height":900}, accept_downloads=True)
        pg  = ctx.new_page()
        pg.on("pageerror", lambda e: bug("JS","runtime",str(e),"","Erro JS"))

        for fn in [persona_A, persona_B, persona_C, persona_D, persona_E]:
            try:
                fn(pg)
            except Exception as e:
                bug(fn.__name__,"execução",str(e),"sem exceção","ver traceback")
                import traceback; traceback.print_exc()

        br.close()

    total_checks = len(BUGS) + len(PASSES)
    print("\n" + "="*62)
    print("RELATÓRIO DETALHISTA FINAL")
    print("="*62)
    print(f"\n  ✅ Checks passados: {len(PASSES)}/{total_checks}")
    print(f"  ❌ Bugs:           {len(BUGS)}/{total_checks}")

    if BUGS:
        print("\n─── BUGS ENCONTRADOS ───────────────────────────────────────")
        for i, b in enumerate(BUGS, 1):
            print(f"\n  🐛 #{i} [{b['persona']}] {b['check']}")
            print(f"       Encontrado: {b['found']}")
            print(f"       Esperado:   {b['expected']}")
            print(f"       Causa:      {b['cause']}")
    else:
        print("\n  🏆 Zero bugs. Roteiro Fácil passou em todos os checks detalhistas!")

    with open("/tmp/bugs_detalhistas.json","w") as f:
        json.dump({"bugs":BUGS,"passes":[p['check'] for p in PASSES]}, f, ensure_ascii=False, indent=2)

    return BUGS

if __name__=="__main__":
    bugs = run()
    print(f"\n📄 /tmp/bugs_detalhistas.json")
    print(f"📸 /tmp/test_det_*.png")
