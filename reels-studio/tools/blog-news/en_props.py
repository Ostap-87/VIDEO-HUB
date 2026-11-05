# Английские версии выпусков 多 NEWS (05.11.2026): копия русского props + английские тексты из английской версии статьи.
# python3 tools/blog-news/en_props.py [номера]  →  props/blog-news/en/NNN-<slug>.json (lang: "en", экраны en-NN.jpg).
# Новый выпуск: дописать EN[N] (title, hook, beats по порядку русских, punch, brand, ticker, cover), числа — по-английски
# (pre/suf: "$", "¥", "M", "B", "K"), мат — знаками.
import json, copy, glob, os, sys
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'props', 'blog-news')
SEASON = {"Перезапуски": "Restarts", "Наблюдения": "Observations", "Напитки Азии": "Asia's Drinks"}
FROM = "— from the article"

EN = {}
EN[1] = dict(
 title="Coffee with a Hint of Audit",
 hook=dict(lines=["A COFFEE CHAIN", "FOOLED", "THE WORLD"], shout=["…then kept it", "caffeinated!"]),
 beats=[
  dict(kicker="2017 → 2019", title="Takeoff", steps=[["OCT 2017", "founded in Beijing"], ["MODEL", "pickup counters, orders only in the app"], ["MAY 2019", "Nasdaq, $17 a share"]],
       big=dict(pre="≈$", num=645, suf="M", text="raised on Nasdaq"), note="Eighteen months from first store to opening bell."),
  dict(kicker="2020", title="The Fall", steps=[["JAN 31, 2020", "Muddy Waters: sales heavily inflated"], ["APR 2, 2020", "the company admitted it"], ["MAY 2020", "CEO and COO fired"]],
       big=dict(pre="¥", num=2.2, dec=1, suf="B", text="of 2019 sales made up (≈ $310M)"), mark="−76% in a day",
       stamp=dict(text="DELISTED", sub="Nasdaq · June 29, 2020"), note="A $180M SEC fine, then bankruptcy protection in February 2021."),
  dict(kicker="2021 → 2022", title="Restart", steps=[["SPRING 2021", "Centurium Capital put in another $240M"], ["2022", "the company exited bankruptcy"]],
       big=dict(pre="$", num=460, suf="M", text="of debt restructured"),
       note="“Today’s Luckin is an essentially new company — with only the name unchanged.” Guo Jinyi, CEO"),
  dict(kicker="2023 → 2025", title="The Comeback", round="ROUND 2023 · CHINA", result="Summer 2023: quarterly revenue in China tops Starbucks",
       facts=[dict(text="stores by the end of 2025"), dict(pre="¥", suf="B", text="2025 revenue, up 43%"), dict(suf="M", text="Moutai baijiu lattes on day one")]),
 ],
 punch=["The fraud", "was in", "the reports,", "not in", "the cups."],
 brand=None,
 ticker=["Luckin Coffee (瑞幸咖啡) — founded in Beijing in October 2017", "Nasdaq IPO in May 2019: $17 a share, ≈$645M raised",
  "April 2, 2020: admitted ¥2.2B of fabricated sales", "June 29, 2020: delisted from Nasdaq", "SEC fine — $180 million",
  "2022: exited bankruptcy", "2023: China’s largest coffee chain", "End of 2025: 31,048 stores, revenue ¥49.3B (+43%)",
  "Summer 2025: first stores in Manhattan", "The founders launched Cotti Coffee — a cup dropped to around nine yuan"],
 cover=dict(big="−76%", bigText="share price in one day", blurbs=[["¥2.2B", "of made-up sales"], ["31,048", "stores by the end of 2025"]], tag="Fraud, delisting — and a comeback"),
)
EN[2] = dict(
 title="The Teacher Who Went into Retail",
 hook=dict(lines=["HE WAS", "BANNED FROM", "TEACHING"], shout=["…so he went", "into retail!"]),
 beats=[
  dict(kicker="1993 → 2021", title="Takeoff", steps=[["GAOKAO ×3", "failed English twice, then Peking University"], ["1993", "founded New Oriental: TOEFL and GRE prep"], ["2006", "took the company public in New York"]],
       big=dict(pre="≈$", num=4.3, dec=1, suf="B", text="revenue, fiscal year to May 2021"), note="New Oriental’s motto: “Seek hope in despair, and life will shine in the end.”"),
  dict(kicker="2021", title="The Ban", steps=[["SUMMER 2021", "“double reduction”: no for-profit school tutoring"], ["IN 2021", "revenue −80%, 60,000 people let go"], ["NOV 2021", "≈80,000 desk sets to rural schools"]],
       big=dict(pre="≈¥", num=20, suf="B", text="on refunds, severance and rent"), mark="−90% market value",
       stamp=dict(text="BANNED", sub="“double reduction” · 2021"), note="The desks were the only staff laid off that year who ended up with a better job."),
  dict(kicker="2021 → 2023", title="Groceries", steps=[["DEC 2021", "live on Douyin: rice and fruit as a geography lesson"], ["JUN 2022", "teachers sell in English, star: Dong Yuhui"], ["MAR 2023", "Koolearn renamed East Buy"]],
       big=dict(num=10, suf="M", text="followers in a week (from ≈1M)"), mark="shares ×5 in a week", note="“Seek hope in despair.” Hope turned up in the grocery aisle."),
  dict(kicker="2023 → 2026", title="The Comeback", left="TEACHER", right="THE BAN", round="ROUND 2026 · CHINA",
       result="New Oriental walked back into the classroom through a different door",
       facts=[dict(pre="¥", suf="M", text="East Buy profit, fiscal year to May 2023"), dict(pre="≈", suf="M", text="viewers watched Yu and Dong make up"), dict(pre="$", suf="B", text="New Oriental revenue, year to May 2026")]),
 ],
 punch=["You can ban", "a profession.", "You can’t ban", "the ability to", "explain things."],
 brand=None,
 ticker=["Yu Minhong (俞敏洪) — passed the gaokao on his third try, Peking University", "1993: founded New Oriental — TOEFL and GRE prep",
  "2006: New Oriental lists in New York", "Summer 2021: “double reduction” — no for-profit school tutoring",
  "2021: market value −90%, revenue −80%, 60,000 let go", "≈80,000 sets of desks and chairs to rural schools",
  "June 2022: the stream grew from ≈1M to 10M followers in a week", "December 2023: a row over scripts — East Buy shares −22%",
  "July 2024: Dong Yuhui left, East Buy GMV −40% over the year (Caixin)", "New Oriental revenue: ≈$4.3B (2021) → $5.66B (2026)"],
 cover=dict(big="60,000", bigText="people let go", blurbs=[["−90%", "market value in 2021"], ["$5.66B", "revenue in 2026"]], tag="A ban, corn on air — and a comeback"),
)
EN[3] = dict(
 title="This Is My Last Startup. Season Six",
 hook=dict(lines=["THIS IS MY", "LAST", "STARTUP"], shout=["…and this is", "season six!"]),
 beats=[
  dict(kicker="2006 → 2019", title="A Catalog of Flops", steps=[["2006", "blogging platform Bullog — closed"], ["2008", "Laoluo English school — closed"], ["2018", "TNT desktop and Bullet Message vs WeChat"]],
       big=dict(num=198, suf=" days", text="the Bullet Message team lasted"), stamp=dict(text="CLOSED", sub="Bullog · Laoluo · Bullet"),
       note="A failure counted down to the day is already a small success."),
  dict(kicker="2018 → 2022", title="Paying It Back", steps=[["END 2018", "Smartisan shut, ≈¥600M debt, Luo the guarantor"], ["BLACKLIST", "no flights, no first class, no nice hotels"], ["SPRING 2020", "Douyin streams: sells everything"]],
       big=dict(pre="¥", num=15, suf="M", text="per slot on his first stream, reportedly"), note="Netizens called it “The Legend of Really Paying Back.”"),
  dict(kicker="2022 → 2025", title="The Last Startup", steps=[["2022", "Thin Red Line: AR glasses"], ["PROTOTYPE", "too heavy to mass-produce"], ["JAN 2025", "pivot to AI: J1 Assistant beta"]],
       big=dict(pre="≈$", num=50, suf="M", text="angel round: Meituan, DJI, top funds"), stamp=dict(text="PIVOT", sub="AR → AI"),
       note="“This will probably be my last venture. I’m putting everything into it.” Luo Yonghao, 2022"),
  dict(kicker="2025", title="The Avatar", left="AVATAR", right="REAL LUO", round="ROUND 2025 · BAIDU",
       result="June 2025: in several categories the avatar outsold the real Luo’s May stream",
       facts=[dict(suf="M", text="views in a 6-hour-plus stream"), dict(pre="≈¥", suf="M", text="avatar sales in one stream"), dict(suf="K", text="words of product copy written by AI")]),
 ],
 punch=["Failure", "is a comma,", "not a", "full stop."],
 brand=dict(name="Luo Yonghao"),
 ticker=["Luo Yonghao (罗永浩) — founder of Smartisan", "2006 Bullog → 2008 Laoluo English → 2012 Smartisan",
  "2018: Bullet Message — team disbanded after 198 days", "2019: an e-cigarette — dropped in under six months",
  "Smartisan debts — ≈¥600M, Luo the personal guarantor", "2019: ByteDance bought Smartisan’s patents",
  "January 2022: enforcement records vanished from court databases", "Thin Red Line: planned 1,000 staff, peaked at ≈150",
  "June 2025: AI avatar — 13M views, ¥55M in sales", "September 2025: the Xibei row — broccoli with a two-year shelf life"],
 cover=dict(big="198 days", bigText="Bullet Message lasted", blurbs=[["≈¥600M", "of Smartisan debt"], ["13M", "views for the AI avatar"]], tag="Six flops — and an AI avatar"),
)
EN[4] = dict(
 title="The Fastest Man in Town",
 hook=dict(lines=["ORDER ACCEPTED.", "HE’S ON", "HIS WAY."], shout=["Don’t wait for food —", "greet it!"]),
 beats=[
  dict(kicker="2023 · MEITUAN", title="Not a Street but a Beehive", big=dict(suf="M", text="riders earned income on Meituan in 2023"), equal="the population of Hong Kong",
       chips=["¥80B paid to riders in a year", "≈¥3.65 per delivery — TechNode’s math"]),
  dict(kicker="SEPTEMBER 2020", title="Trapped in the System", panels=["Meituan’s “Super Brain,” Ele.me’s “Ark”", "Made it — great. Tomorrow, make it faster"],
       big=dict(suf=" minutes", text="of flexibility per order — Meituan’s reply the next day")),
  dict(kicker="A SCENE AT THE ENTRANCE", title="The Shortest Relationship", a="Me", b="Rider",
       lines=["Where are you?", "Downstairs.", "I can’t see you.", "I’m in a yellow jacket.", "Everybody’s in a yellow jacket.", "I’m the one who’s already leaving. Five stars, please!"]),
  dict(kicker="JULY 5, 2025", title="The Record", left="RIDERS", right="SERVERS", round="ROUND 2025 · DELIVERY WAR", result="The riders held up. The servers didn’t.",
       facts=[dict(pre=">", suf="M", text="orders in a day — Meituan’s record"), dict(big="2025", text="JD entered delivery, Alibaba hit back with subsidies"), dict(big="insurance", text="for riders: JD full-time, Meituan most regular")]),
 ],
 punch=["Speed", "isn’t a", "technology.", "It’s a person."],
 brand=dict(name="Delivery riders"),
 ticker=["Meituan: 7.45M riders earned income in 2023", "¥80B paid to riders in a year, ≈¥3.65 per delivery (TechNode)",
  "Jackets: yellow, blue, and since 2025 red ones too", "September 2020: “Delivery Riders, Trapped in the System,” Renwu magazine",
  "Meituan’s “Super Brain,” Ele.me’s “Ark”", "Meituan’s reply: eight minutes of flexibility per order",
  "2025: JD.com entered food delivery, Alibaba answered with subsidies", "July 5, 2025: over 120M orders in a day — the servers buckled",
  "Social insurance for riders: JD full-time riders from March 2025"],
 cover=dict(big="7.45M", bigText="riders on Meituan alone", blurbs=[["8 minutes", "of flexibility per order"], [">120M", "orders in one day"]], tag="A beehive, an algorithm — and a record"),
)
EN[5] = dict(
 title="The City Where Nobody Carries a Wallet",
 hook=dict(lines=["MY WALLET", "STAYED AT", "THE HOTEL."], shout=["Not forgetfulness —", "adaptation!"]),
 beats=[
  dict(kicker="AN INTERMISSION", title="Paid by QR Code", items=["Lunch.", "A taxi.", "A bike.", "A power bank, so your phone doesn’t die while you pay with your phone.", "A street musician.", "A second lunch.", "The feeling that you belong."]),
  dict(kicker="H1 2024", title="Who Scans Whom", big=dict(pre=">", suf="M", text="foreign visitors paid by phone in China"), equal="four times more than a year earlier",
       chips=[">90M transactions — seven times more", "≈1.1B internet users in China"]),
  dict(kicker="THE SCARY PART", title="A Dead Phone", panels=["Anywhere else, a dead phone is an inconvenience", "In China, it’s a temporary loss of citizenship"]),
  dict(kicker="2020 → 2024", title="Back for Grandma", steps=[["LAW", "cash is legal tender"], ["2020", "the central bank fined 16 organizations"], ["2024", "a KFC franchise in Wuxi among them"]],
       big=dict(pre="up to ¥", num=500, suf="K", text="fine for refusing cash"), note="First everyone races ahead. Then somebody goes back for grandma."),
 ],
 punch=["Money you", "can’t see", "is spent", "like time."],
 brand=None,
 ticker=["China has almost 1.1 billion internet users", "The big question: “Do you scan me, or do I scan you?”",
  "Since 2023–2024, foreign cards link more easily to Alipay and WeChat Pay", "H1 2024: >5M foreign visitors paid by phone — four times more",
  "Over 90M foreign transactions — seven times more than a year earlier", "Cash is legal tender, refusing it is not allowed",
  "2020: the central bank fined 16 organizations, some up to ¥500,000", "2024: a KFC franchise in Wuxi was among those fined"],
 cover=dict(big=">5M", bigText="foreigners paid by phone", blurbs=[["1.1B", "people online in China"], ["¥500K", "fine for refusing cash"]], tag="QR codes, a dead phone — and grandma"),
)
EN[6] = dict(
 title="Whoever Dances Owns the Square",
 hook=dict(lines=["EIGHT P.M.", "THE SQUARE.", "THE SPEAKER."], shout=["The square belongs", "to the dancers!"]),
 beats=[
  dict(kicker="PRESS ESTIMATE", title="A Hundred Million", big=dict(pre="up to ", suf="M", text="people dance on squares at night"), equal="a mid-sized country",
       chips=["Rows of 20, 40, sometimes 100", "Every night at eight"]),
  dict(kicker="THE NEIGHBORS", title="$40,000 for Silence", steps=[["BEIJING", "a shotgun fired, dogs set on dancers"], ["ELSEWHERE", "bags dropped from windows"], ["NEIGHBORS", "pooled money for their own speaker"]],
       big=dict(pre=">$", suf="K", text="for a speaker to drown out theirs"), stamp=dict(text="SILENCE", sub="a premium product"),
       note="You can’t defeat someone who came to dance, not to fight."),
  dict(kicker="2015 · THE MINISTRIES", title="Twelve Routines", a="Ministry", b="Grandmas",
       lines=["Comrades, here are twelve approved routines.", "We dance our own.", "This routine is scientifically designed!", "We dance our own.", "Then consider it a recommendation.", "Considered."]),
  dict(kicker="LAW · JUNE 2022", title="Negotiating the Decibels", panels=["Noise law: area, time and volume — by the venue’s rules", "The square runs two shifts, like a well-managed factory"],
       big=dict(suf=" p.m.", text="till nine — dancers, after nine — sleepers")),
 ],
 punch=["Nowhere", "to hurry,", "but somewhere", "to go."],
 brand=dict(name="Square dancing"),
 ticker=["Chinese media: up to 100M people dance like this", "Rows of 20, 40, sometimes 100 — every night at eight",
  "Beijing: a shotgun fired into the air, dogs set on the dancers", "Neighbors pooled over $40,000 for their own speaker",
  "2015: twelve “scientific” routines, one set to “Little Apple”", "Officials clarified: the routines are optional",
  "June 5, 2022: noise law — venue rules on area, time and volume", "The square: dancers till nine, sleepers after nine"],
 cover=dict(big="100M", bigText="dance on squares", blurbs=[[">$40K", "for the neighbors’ speaker"], ["12", "“scientific” routines"]], tag="A speaker, neighbors — and a noise law"),
)
EN[7] = dict(
 title="Chicken Palate, Noodles, and Zero Regrets",
 hook=dict(lines=["FRIED", "COCKROACHES?", "NO."], shout=["That’s not China —", "it’s a tourist show!"]),
 beats=[
  dict(kicker="OFFICIALLY", title="Eight Cuisines", big=dict(pre="≈", text="officially registered dishes"), equal="8 regional cuisines",
       chips=["Sichuan, Cantonese, Shandong, Jiangsu — the big four", "Cities have their own: Huaiyang, Shunde"]),
  dict(kicker="THE SEMI-LOCAL KIT", title="What to Grab by the Metro", items=["Bubble tea to go", "Chicken palates", "Duck necks", "Fish thighs", "Latiao — every spice level", "Pickled jellyfish", "Hot-and-sour potato strips", "And it’s genuinely delicious!"]),
  dict(kicker="BECOMING SEMI-LOCAL", title="Noodles for Breakfast", panels=["Yes, they eat noodles in the morning", "Six or seven main kinds — and you start telling them apart"],
       big=dict(text="main kinds of noodles")),
  dict(kicker="FIVE STARS", title="Breakfast in Hangzhou", steps=[["HANGZHOU", "five-star hotel, buffet breakfast"], ["ACROSS FROM US", "a chicken leg, the bone — onto the floor"], ["NEXT", "a cigarette and a sneeze across the room"]],
       big=dict(suf=" minutes", text="— and he calmly goes on eating"), stamp=dict(text="5 STARS", sub="free show included"), note="You came here to eat, so you eat."),
 ],
 punch=["You came", "here to eat,", "so", "you eat."],
 brand=dict(name="Food in China"),
 ticker=["China has eight major regional cuisines", "The big four: Sichuan, Cantonese, Shandong, Jiangsu",
  "About 80,000 officially registered dishes", "Scorpions on a stick are a show for foreigners, not China",
  "Any negotiation starts with eating together", "Want to sign a contract? First eat a duck. Two, ideally",
  "Six or seven main kinds of noodles", "In Hong Kong, smoking in a restaurant gets you a fine"],
 cover=dict(big="80,000", bigText="official dishes", blurbs=[["8", "regional cuisines"], ["6–7", "kinds of noodles"]], tag="Metro snacks, noodles — and a breakfast show"),
)
EN[8] = dict(
 title="Three Days in Shanghai and You're Already a China Expert",
 hook=dict(lines=["THREE DAYS", "IN SHANGHAI —", "AN EXPERT"], shout=["Characters known:", "zero!"]),
 beats=[
  dict(kicker="INSTANTLY RECOGNIZABLE", title="Symptoms of an Expert", items=["Not a single character — except his favorite noodle joint’s sign", "English: “hello, how much”", "Worldview: from the Nike store to the Zara store", "But — “connections in the halls of power”", "Above all, swagger. It compensates for everything"]),
  dict(kicker="DINNER FOR 15", title="Case One", a="Me", b="Expert",
       lines=["How many ethnic groups officially live in China?", "…", "That’s total b#llsh#t, nobody cares!", "When was the Communist Party founded?", "…"]),
  dict(kicker="A BAR IN SHANGHAI", title="Case Two", left="LAWYER", right="THE BOSS", round="ROUND · FRIDAY, A BAR", result="“Through Bandar Abbas?” — “Where’s that, exactly?”",
       facts=[dict(suf=" weeks", text="both have been in China"), dict(pre=">", suf=" years", text="the head of logistics is over"), dict(big="0", text="words of English or Chinese — the boss")]),
  dict(kicker="DIAGNOSIS", title="The Paramecium", panels=["No goal, but cilia — paddling energetically", "…where to, not quite sure"],
       big=dict(suf=" questions", text="— and you see what frequency they’re on")),
 ],
 punch=["Swagger", "compensates", "for", "everything."],
 brand=dict(name="“China experts”"),
 ticker=["A China expert is made between baggage claim and the first taxi", "Chinese — not a single character, English — “hello, how much”",
  "Worldview: from the Nike store to the Zara store", "Gentle Monster: the glasses really are pretty vibey",
  "Dinner for 15: two simple questions — and silence", "A bar in Shanghai: “Bandar Abbas? Where’s that, exactly?”",
  "Plenty of sharp managers go abroad — but not only them"],
 cover=dict(big="3 days", bigText="— and a China expert", blurbs=[["0", "Chinese characters"], ["2", "simple questions"]], tag="Swagger, a paramecium — and Bandar Abbas"),
)

def apply(ru, en):
    d = copy.deepcopy(ru)
    d["lang"] = "en"
    d["title"] = en["title"]
    d["season"]["name"] = SEASON[d["season"]["name"]]
    d["shots"] = [s.replace("/ru-", "/en-") for s in d["shots"]]
    d["hook"]["lines"] = en["hook"]["lines"]; d["hook"]["shout"] = en["hook"]["shout"]
    for b, e in zip(d["beats"], en["beats"]):
        for k in ("kicker", "title", "note", "mark", "equal", "chips", "round", "result", "left", "right"):
            if k in e: b[k] = e[k]
        if "steps" in e:
            assert len(e["steps"]) == len(b["steps"]), (d["ep"], b["title"])
            b["steps"] = [{"when": w, "text": t} for w, t in e["steps"]]
        if "big" in e:
            for k, v in e["big"].items(): b["big"][k] = v
            if "suf" not in e["big"] and "suf" in b["big"]: del b["big"]["suf"]
            if "pre" not in e["big"] and "pre" in b["big"]: del b["big"]["pre"]
        if "stamp" in e:
            b["stamp"]["text"] = e["stamp"]["text"]; b["stamp"]["sub"] = e["stamp"]["sub"]
        if "items" in e:
            assert len(e["items"]) == len(b["items"]), (d["ep"], b["title"]); b["items"] = e["items"]
        if "panels" in e:
            for p, c in zip(b["panels"], e["panels"]): p["cap"] = c
        if "lines" in e:
            assert len(e["lines"]) == len(b["lines"]), (d["ep"], b["title"])
            for l, t in zip(b["lines"], e["lines"]): l["text"] = t
            b["a"]["name"] = e["a"]; b["b"]["name"] = e["b"]
        if "facts" in e:
            for fct, fe in zip(b["facts"], e["facts"]):
                for k in ("pre", "suf"):
                    if k in fe: fct[k] = fe[k]
                    elif k in fct: del fct[k]
                fct["text"] = fe["text"]
                if "big" in fe: fct["big"] = fe["big"]
    d["punch"]["lines"] = en["punch"]; d["punch"]["from"] = FROM
    if en.get("brand"): d["brand"]["name"] = en["brand"]["name"]
    d["ticker"] = en["ticker"]
    n = d["next"]
    n["title"] = EN.get(n["n"], {}).get("title", NEXT_EN.get(n["n"], n["title"]))
    if "season" in n: n["season"] = SEASON.get(n["season"], n["season"])
    c = en["cover"]
    d["coverArt"]["big"] = c["big"]; d["coverArt"]["bigText"] = c["bigText"]; d["coverArt"]["tag"] = c["tag"]
    d["coverArt"]["blurbs"] = [{"big": a, "text": t} for a, t in c["blurbs"]]
    return d

NEXT_EN = {9: "Asia’s Drinks: Japan — Coffee Already Grew Up, Bubble Tea Is Still a Teenager"}
only = [int(x) for x in sys.argv[1:]] or sorted(EN)
for p in sorted(glob.glob(R + "/0*.json")):
    ru = json.load(open(p))
    if ru["ep"] not in only: continue
    out = R + "/en/" + os.path.basename(p)
    json.dump(apply(ru, EN[ru["ep"]]), open(out, "w"), ensure_ascii=False, indent=1)
    print("ok", out)
