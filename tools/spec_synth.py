"""Synthesis files of a crate specification, generated from its rows (docs/workflow/specification.md §7, S3).

    python3 tools/spec_synth.py <crate> <short> <cm6 package> <version> <mirror commit> [stack] [contracts] [hazards] [views]

Example: python3 tools/spec_synth.py ferrum-state state @codemirror/state 6.7.6 651084c stack contracts hazards views
Reads docs/parity/<crate>/raw/{inventory,behaviors,tests,throws}.jsonl; writes stack.md, contracts.md, hazards.md
(behavior hazards per item, then the throw facts of raw/throws.jsonl) and the rendered views inventory.md, behaviors.md, tests.md.
"""
import json,subprocess,collections,sys,os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CRATE,SHORT,PKG,VER,MC=sys.argv[1:6]
os.chdir(os.path.join(ROOT,'docs','parity',CRATE))
def load(p): return [json.loads(l) for l in open(p,encoding='utf-8').read().split('\n') if l.strip()]
FC=subprocess.check_output(['git','rev-parse','--short','HEAD'],text=True).strip()
INV={r['id']:r for r in load('raw/inventory.jsonl')}; B=load('raw/behaviors.jsonl')
HDR=lambda what,ids: (f"- **What:** {what}\n- **cm6:** `{PKG}` {VER}, mirror commit {MC}; `mirrors/...` line numbers refer to it.\n"
  f"- **Ferrum commit:** {FC}; line numbers in `docs/` and `tools/` refer to it.\n- **Ids:** {ids}\n")
IDS_B=f"behaviors `{SHORT}.<item>.B<n>`; inventory rows `{SHORT}.cm6.<nnn>`"
def peritem(field, skip):
    by=collections.OrderedDict()
    for b in B:
        for x in b[field]:
            if skip(x): continue
            by.setdefault(b['item_id'],collections.OrderedDict()).setdefault(x,[]).append(b['id'].rsplit('.',1)[1])
    return by
def section(by):
    out=''
    for iid in sorted(by):
        r=INV[iid]; out+=f"\n## {iid} `{r['item']}`\n\n"
        for note,bs in by[iid].items(): out+=f"- {note} ({', '.join(bs)})\n"
    return out
which=sys.argv[6:]
if 'stack' in which:
    by=peritem('stack',lambda s:s.strip().lower().startswith('none found'))
    n=sum(len(v) for v in by.values())
    open('stack.md','w',encoding='utf-8').write(f"# {CRATE}: mechanisms that exist because of cm6's stack\n\n"+HDR("the stack notes of `raw/behaviors.jsonl` (`stack` field), grouped by inventory item, identical notes merged; each note ends with the behaviors (`B<n>` of that item) that carry it. Generated from the rows; items whose behaviors all say `none found` are left out. Facts, not proposals (`docs/workflow/specification.md` §5, §7).",IDS_B)+f"\nItems with notes: {len(by)} of {len({b['item_id'] for b in B})}; distinct notes: {n}.\n"+section(by))
if 'contracts' in which:
    c=collections.Counter(r['disposition'] for r in INV.values())
    open('contracts.md','w',encoding='utf-8').write(f"# {CRATE}: contracts\n\n"+HDR("per `CONTRACT` item, the question asked of the platform, the logic around it and the smallest fake (`docs/workflow/specification.md` §7).",f"inventory rows `{SHORT}.cm6.<nnn>`")+f"\nNo item of `{PKG}` has the disposition `CONTRACT` (`raw/inventory.jsonl`: {', '.join(f'{k} {v}' for k,v in sorted(c.items()))}; decided in `dispositions.md`), so this crate asks nothing of a surface and this file has no entries.\n")
if 'hazards' in which:
    by=peritem('hazards',lambda s:False); n=sum(len(v) for v in by.values())
    T=load('raw/throws.jsonl')
    t="\n## Throws\n\nEvery throw cm6 reaches in this package (`docs/workflow/specification.md` §7): explicit `throw` statements, then runtime errors the behaviors record. Columns: where, error, condition, what it protects, whether a caller can check it in advance (and how), the public items that reach it, behaviors, fixtures, cm6 tests.\n\n"
    t+="| Where | Kind | Error | Condition | Protects | Checkable in advance | Reached through | Behaviors | Fixtures | cm6 tests |\n|---|---|---|---|---|---|---|---|---|---|\n"
    cell=lambda v: (', '.join(map(str,v)) if isinstance(v,list) else str(v or '')).replace('|','\\|').replace('\n',' ')
    for r in T: t+='| '+' | '.join(cell(r.get(k)) for k in ['cm6','kind','error','condition','protects','checkable','public_entry','behaviors','fixtures','tests'])+' |\n'
    open('hazards.md','w',encoding='utf-8').write(f"# {CRATE}: JS→Rust hazards\n\n"+HDR("the hazards the cm6 implementation relies on (`docs/workflow/specification.md` §5 point 7), from the `hazards` field of `raw/behaviors.jsonl` grouped by inventory item, identical notes merged, each ending with the behaviors (`B<n>`) that carry it; then every throw with its condition, what it protects and whether a caller can check it in advance (§7). Generated from the rows and the throw facts.",IDS_B+"; fixtures `<chunk>:F<nnnn>` in `fixtures/<chunk>.jsonl`; cm6 tests `<file>#<nn>`")+f"\nThrows: {len(T)}. Items with hazards: {len(by)}; distinct notes: {n}.\n"+t+"\n## Hazards per item\n"+section(by))
if 'views' in which:
    R=lambda f,cols,title,what,ids: subprocess.run(['python3',os.path.join(ROOT,'tools','render.py'),f,'--cols',cols,'--title',title,'--header',HDR(what,ids)],stdout=open(title.split(': ')[1]+'.md','w',encoding='utf-8'),check=True)
    R('raw/inventory.jsonl','id,item,kind,file,line,chunk,disposition,reason,does,platform,used_by',f'{CRATE}: inventory',f'every exported and internal item of `{PKG}` with its S1 facts and the consultant\'s disposition (`docs/workflow/specification.md` §3), rendered from `raw/inventory.jsonl` with `tools/render.py`.',f'inventory rows `{SHORT}.cm6.<nnn>`')
    R('raw/behaviors.jsonl','id,item_id,text,cm6,deps,consumer_values,cost,cm6_tests,fixtures,golden_note',f'{CRATE}: behaviors','every behavior of the in-scope items (`docs/workflow/specification.md` §5), rendered from `raw/behaviors.jsonl` with `tools/render.py`; hazards and stack notes are in `hazards.md` and `stack.md`.',IDS_B+"; fixtures `F<nnnn>` in `fixtures/<chunk>.jsonl` of the item's chunk; cm6 tests `<file>#<nn>`")
    R('raw/tests.jsonl','id,file,line,describe,name,class,class_reason,behaviors,scenario,expected,port_notes',f'{CRATE}: tests',f"every cm6 test case of `mirrors/cm6/{PKG.split('/')[-1]}/test/` in catalog order, then one derived test per behavior no cm6 test covers (`docs/workflow/specification.md` §6), rendered from `raw/tests.jsonl` with `tools/render.py`.",f"cm6 tests `<file>#<nn>`; derived tests `derived:<behavior id>`; behaviors `{SHORT}.<item>.B<n>`")
