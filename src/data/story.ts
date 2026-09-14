import type { StoryLine, StoryScene, StoryOption } from '@/types/story';
export type { StoryLine, StoryScene } from '@/types/story';
const t=(zh:string,en:string)=>({zh,en});
const a=(zh:string,en:string,expression:StoryLine['expression']='calm'):StoryLine=>({speaker:'aurelia',zh,en,expression});
const p=(zh:string,en:string):StoryLine=>({speaker:'player',zh,en});
const n=(zh:string,en:string):StoryLine=>({speaker:'narrator',zh,en});
const option=(id:string,zh:string,en:string,replyZh:string,replyEn:string):StoryOption=>({id,text:t(zh,en),reply:t(replyZh,replyEn)});
const choice=(line:StoryLine,id:string,options:StoryOption[]):StoryLine=>({...line,choice:{id,options}});
const main=(chapter:number,title:ReturnType<typeof t>,location:ReturnType<typeof t>,lines:StoryLine[]):StoryScene=>({id:`stage2-${chapter}`,chapter,title,location,lines,kind:'main',artId:`stage2-${chapter}`,condition:{minChapter:chapter}});

const scenes:StoryScene[]=[
main(1,t('把空白留给明天','Room for Tomorrow'),t('初抵群岛','First landfall'),[
 n('你带来的电路图被风翻到背面。纸上只有一道墨痕，像一条还没找到岸的航线。','Wind turns your circuit diagram over. A stray ink line crosses the blank paper like a route seeking a shore.'),
 a('别追了，我接住了。……原来不是地图。抱歉，我太久没见过从外面带来的东西。','I caught it. Oh… this is not a map. Forgive me. It has been a while since anything arrived from outside.','surprise'),
 p('第一道门后只有你一个人？','Were you alone beyond the first gate?'),
 a('我是奥蕾莉娅，这里的守望者。我记得哪些道路断了，却想不起上次有人走过时的声音。','I am Aurelia, the keeper here. I remember which roads broke, but not the sound of the last person who crossed them.','think'),
 p('那我们从哪一条开始？','Which road do we begin with?'),
 a('先接回两段蕴含。岛上的前提是出发点，星盘上的结论是目的地。路能不能通，要交给证明。','Two implications first. The premises on the island are our starting points; the conclusion on the dial is our destination. The proof will tell us whether they connect.'),
 choice(a('纸的背面还空着。你想把它用来记什么？','The back of your page is still blank. What shall we put there?','smile'),'journal-purpose',[
 option('routes','记下走通的路。','The roads we reconnect.','那我来画岸线。你的线画得直，我的……比较像风。','Then I will draw the shores. Your lines are straight. Mine look more like the wind.'),
 option('moments','记下路上遇见的事。','What happens along the way.','连刚才追纸这件事也算吗？那请把我接住它的部分写清楚。','Even chasing this page? Please make sure you include the part where I caught it.')]),
 n('她在页角画下一盏小灯，给日期留了一个空位。你们谁也没有急着填满它。','She draws a small lamp in the corner and leaves room for a date. Neither of you rushes to fill it in.'),
]),
main(2,t('两杯茶的次序','The Order of Two Cups'),t('交换之流','The Commutation Current'),[
 n('奥蕾莉娅把两只杯子排在图纸旁，一只靠近你，一只压着翘起的纸角。','Aurelia sets two cups beside the diagram. One is near you; the other holds down a curling corner.'),
 a('这是岛上最后两只不漏水的杯子。我本来想先问你喝不喝，结果已经倒好了。','These are the last two cups here that do not leak. I meant to ask whether you wanted tea before pouring it.','smile'),
 p('回答晚一点，茶也不会变掉。前提的顺序也是这样吗？','A late answer will not change the tea. Is the order of premises like that?'),
 a('在今天这条定理里，可以证明某种交换成立。但机器只认它接到的公式，我们仍要把转换接出来。','For this theorem, a particular exchange can be proved. The machine reads the formulas it receives; we still need to build that conversion.','think'),
 p('你总是把“可以”说得很小心。','You are careful with the word “can.”'),
 a('以前我替别人把许多事都说成“当然”。后来只剩下我记得那些话。','I used to call many things obvious on other people’s behalf. Eventually I was the only one left to remember saying them.','worry'),
 p('那不确定的时候，我们就把它写下来，一起检查。','Then when we are unsure, we can write it down and check together.'),
 a('好。这杯给你——只是因为离你近，没有更深的定理。','All right. This cup is yours, simply because it is nearer. There is no deeper theorem.','smile'),
]),
main(3,t('借来的那一笔','A Borrowed Stroke'),t('接力花园','Relay Gardens'),[
 n('航图上多了几处擦痕。她没有换掉旧纸，而是把磨薄的地方衬在一片叶子上。','Erasures have worn the chart thin. Instead of replacing it, she slips a leaf beneath the fragile patch.'),
 a('今天要接更长的路。已经证明过的定理可以复用，不必每次从第一枚芯片开始。','Today’s road is longer. A theorem we have proved can be reused; we need not start with the first chip every time.'),
 p('你也会借用别人留下的证明吗？','Do you borrow proofs left by other people?'),
 a('会。有些署名我已经不认识，推导却还成立。我替他们修过书脊，可惜没有问过他们喜欢什么花。','Yes. Some names are unfamiliar now, though their proofs still hold. I repaired their book spines, but never asked what flowers they liked.','think'),
 choice(a('如果这页也留给后来的人，你想留什么？','If someone finds our page later, what would you leave them?'),'legacy-note',[
 option('method','把来路写清楚。','A clear account of how we got here.','那就别省略前提。也写上哪些路没有走通，后来的人能少绕一点。','Then keep the premises. Include the paths that failed, too; it may save someone a detour.'),
 option('company','告诉他们，这里曾有人同行。','That people once travelled here together.','……我会把这句话写在页边。不会挡住你的证明。','…I will write that in the margin. It will not cover your proof.')]),
 p('叶子快掉了。借我压一下。','The leaf is slipping. Let me hold it.'),
 n('你们同时伸手，又同时停住。最后她托住纸，你把叶子推回原处。这次没有人说“当然”。','You both reach, then hesitate. She steadies the paper while you slide the leaf back. This time neither of you calls it obvious.'),
]),
main(4,t('多留一把椅子','One More Chair'),t('收缩台地','Contraction Terrace'),[
 a('仓库里有三张一模一样的值守表，只有日期不同。我以前觉得，多抄一张就不容易忘。','The storehouse has three identical duty rosters, with different dates. I used to think copying another would help me remember.','think'),
 p('今天也要处理重复的前提？','Are we dealing with repeated premises today?'),
 a('嗯。收缩定理让我们整理这种重复。至于我的表……我想留一张，其余拿来垫花盆。','Yes. Contraction handles that repetition. As for my rosters, I might keep one and put flowerpots on the others.','smile'),
 n('她打开侧门。园圃荒着，架子上却整齐放着两把小铲子。','She opens a side door. The garden is overgrown, but two little spades sit neatly on a shelf.'),
 p('你准备过让这里重新长起来。','You had planned to bring it back.'),
 a('准备过很多次。一个人总觉得先修完别的，再来这里也不迟。','Many times. Alone, I always thought I could repair something else first and come here later.','worry'),
 p('先把这一段证明做完，我们就来看看。也可以只坐一会儿。','After this proof, let us visit. We could just sit for a while.'),
 a('那我去找椅子。一把不够了。','Then I will find the chairs. One will no longer be enough.','smile'),
]),
main(5,t('不必替每朵花道歉','No Apology for Every Flower'),t('园圃门前','By the Garden Gate'),[
 n('门边挂着新写的牌子：“今天可以休息。”字迹很端正，绳结却打反了。','A new sign hangs by the gate: “Rest is allowed today.” The lettering is precise; the knot is backwards.'),
 p('守望者也给自己放假吗？','Does the keeper get a day off?'),
 a('我正在试。以前有叶子枯掉，我会把整晚的记录重新查一遍。','I am trying. I used to recheck an entire night’s records whenever a leaf withered.','think'),
 a('今天的否定有严格的符号和规则。生活里说一句“不”，却不必先把自己送上审判台。','Negation in today’s proof has precise symbols and rules. Saying no in everyday life need not put you on trial.'),
 choice(a('如果我说今天不想谈过去呢？','What if I do not want to talk about the past today?','worry'),'respect-boundary',[
 option('quiet','那就一起看看花。','Then let us look at the flowers.','好。那朵还没有名字，我们暂时也不用替它想。','Yes. That one has no name yet. We do not have to find it one today.'),
 option('tea','我去泡茶，你随时可以来。','I will make tea. Come over whenever you like.','给我留那只歪把手的杯子。我已经习惯它了。','Save me the cup with the crooked handle. I have grown used to it.')]),
 n('她把绳结解开，重新系好。牌子不再倒着，你也没有追问那个“以前”。','She unties the knot and fixes it. The sign hangs straight. You do not press her about the word “used to.”'),
]),
main(6,t('一条没有告诉你的岔路','The Unmentioned Turning'),t('逆否山脊','Contraposition Ridge'),[
 n('你发现航图的一处标记被擦去了。纸背透出的墨迹，仍指向远处的遗迹。','An erased mark catches your eye. Ink showing through the back of the chart still points toward distant ruins.'),
 p('这里原来画了什么？','What was drawn here?'),
 a('旧观测站。那边的记录可能不可靠，我想先确认，再告诉你。','An old observation post. Its records may be unreliable. I wanted to check before telling you.','worry'),
 p('你是在替我判断，还是怕我去了以后不回来？','Are you deciding for me, or afraid I would not return?'),
 a('……都有。我知道这不是一个好理由。可每次有人说“很快”，我都会记住很久。','…Both. I know that is not a good reason. But whenever someone says “soon,” I remember it for a very long time.','worry'),
 choice(p('我们得换一种办法。','We need a different way.'),'trust-method',[
 option('share','不确定的也告诉我，一起决定。','Tell me what is uncertain. We decide together.','好。我会标成“待核实”，不再擦掉。也请你告诉我，你想走哪条路。','All right. I will mark it “unverified,” instead of erasing it. Tell me which route you want to take, too.'),
 option('return','可以担心我，但不要替我选路。','You may worry about me, but let me choose my route.','我会学着把担心说出来。不是把它藏成一道你看不见的门。','I will learn to say I am worried, instead of hiding it behind a door you cannot see.')]),
 a('今天沿着逆否的规则走，不是直接把箭头反过来。至于人的去留……我不能从一个猜测推到最坏的结论。','Today we follow contraposition, rather than simply reversing an arrow. As for people leaving… I cannot turn a guess into the worst conclusion.','think'),
 n('她把橡皮收起来，递给你一支笔。擦痕还在，你们在它旁边写下“待核实”。','She puts the eraser away and hands you a pen. Beside the scar on the paper, you write “unverified.”'),
]),
main(7,t('把工作放下一会儿','Setting the Work Down'),t('分离引擎工坊','Detachment Workshop'),[
 n('工坊的灯还亮着。奥蕾莉娅趴在桌边，手里捏着一枚尚未装好的外壳。','The workshop light is still on. Aurelia rests against the desk, an unfinished casing in her hand.'),
 p('你昨晚没有回去？','Did you stay here all night?'),
 a('最后一个接口总是不对。我想让引擎替你检查公式匹配，你就不用每次都那么费神。','The last connector kept slipping. I wanted the engine to check formula matching for you, so you would not have to inspect it every time.','worry'),
 p('帮我省力，不代表你要把自己的力气都用完。','Saving my effort need not mean exhausting yourself.'),
 a('这句话我很难对自己说。……外壳你来扶住，可以吗？','That is difficult to tell myself. …Would you hold the casing steady?','think'),
 n('你扶着外壳，她旋紧卡扣。轻轻一声，指示灯亮了。她先看向你，才去看灯。','You steady the casing while she fastens it. The indicator lights with a soft click. She looks at you before she looks at the light.'),
 a('匹配成功也仍要有正确的前提。引擎的使用次数有限，农场或交易所能提供补给。我们不急着把所有工作挤在今天。','Correct premises still matter even when matching succeeds. Engine charges are limited; the farm or exchange can supply more. We need not fit every task into today.'),
 p('今天先给值守表加一项：熄灯。','Add one more item to today’s roster: lights out.'),
 a('还有……两个人一起关门。','And… closing the door together.','smile'),
]),
main(8,t('没有观测任务的夜晚','A Night Without an Assignment'),t('克拉维乌斯观测台','Clavius Observatory'),[
 n('她带来了望远镜，也带来了两条毯子。第二条叠得很小，像是临出门才决定添上。','She brings a telescope and two blankets. The second is folded small, as if added just before leaving.'),
 a('今晚没有观测任务。我只是想知道，不写报告的时候，星星看起来会不会不一样。','There is no assignment tonight. I wondered whether the stars would look different without a report to write.','smile'),
 p('结论呢？','And your conclusion?'),
 a('还不能下结论。旁边有人一直在看我，影响观测。','Too early to tell. Someone beside me keeps looking at me. It is affecting the observation.','surprise'),
 n('她把目光移回镜筒，耳边的光比刚才暖了一点。你替她拉住被风卷起的毯角。','She turns back to the eyepiece, a little warmth at her ears. You catch the blanket corner as the wind lifts it.'),
 a('明天的克拉维乌斯定理，会从一个特别的假设关系推出结论。不过，今晚不必把每一句话都变成题目。','Tomorrow, Clavius’s theorem will draw a conclusion from a particular relation involving a supposition. Tonight, we need not turn every sentence into a problem.','think'),
 {...a('我想再坐一会儿。可以吗？','I would like to stay a little longer. May we?','smile'),echo:{choiceId:'legacy-note',optionId:'company',text:t('你说想让后来的人知道，这里曾有人同行。今晚这一页，我想自己来写。','You wanted someone to know that people travelled here together. I would like to write tonight’s page myself.')}},
 p('可以。报告明天再写，或者不写。','Yes. The report can wait until tomorrow, or never.'),
]),
main(9,t('裂痕旁边的位置','A Place Beside the Fracture'),t('旧记录室','The Old Record Room'),[
 {...n('记录室的镜面亮起。奥蕾莉娅抬手遮住光环，指缝间却漏出一道裂痕。','The archive mirror lights up. Aurelia covers her halo, but a fracture shines between her fingers.'),expression:'surprise',halo:'cracked',haloRevealCue:t('裂痕','fracture')},
 a('你看见了。这次我不会说是光线的问题。','You saw it. This time I will not blame the light.','worry'),
 p('会疼吗？','Does it hurt?'),
 a('有时会。我发现一些旧证明恢复之后，裂痕会变深。但我还不知道它们是不是原因。','Sometimes. I have noticed it deepen after some old proofs return. I do not yet know whether they are the cause.','worry'),
 a('记录里没有我的出生，只有一段缺失的推导。我并非生而为女神……也许，我就是这个世界忘记如何证明的那条定理。','There is no record of my birth, only a missing derivation. I was not born a goddess… Perhaps I am the theorem this world forgot how to prove.','think'),
 p('那是一个待核实的解释。你今天坐在这里、会累、会想看星星，这些也都值得我们认真对待。','That is an explanation to investigate. You are also here today, tired, wanting to see the stars. Those things deserve our attention, too.'),
 {...a('我差点又把这一页藏起来。可是我答应过，把不知道的也告诉你。','I nearly hid this page again. But I promised to tell you what I do not know.','worry'),echo:{choiceId:'trust-method',optionId:'return',text:t('我想说：我害怕。不是命令你停下，是想请你陪我看完这一页。','I want to say: I am afraid. That is not an order to stop. I am asking you to read this page with me.')}},
 choice(a('如果查到最后，我不是你以为的那个人呢？','What if the record says I am not who you thought I was?','worry'),'beside-fracture',[
 option('listen','那就听你重新介绍自己。','Then I will listen as you introduce yourself again.','这一次，我会先说我喜欢什么，再说我负责什么。','This time, I will say what I like before saying what I am responsible for.'),
 option('together','我们一起读，不让你一个人面对。','We read it together. You need not face it alone.','那这一页，请你拿着右边。我手有一点抖。','Then hold the right side of this page, please. My hand is shaking a little.')]),
 n('她没有合上记录。你在旁边拉开椅子，留出一段不用解释的距离。','She leaves the record open. You pull up a chair, leaving a little space that needs no explanation.'),
]),
main(10,t('门前的约定','A Promise Before the Gate'),t('第二道门','The Second Gate'),[
 n('门上仍没有路名。奥蕾莉娅把最初那张纸铺开，页角的小灯已经被指尖磨淡。','The gate bears no destination. Aurelia unfolds your first sheet of paper; fingertips have worn the little lamp pale.'),
 {...a('我们走过的地方，已经比空白多了。','We have filled more of the page than we have left blank.','smile'),echo:{choiceId:'journal-purpose',optionId:'moments',text:t('你想记下路上遇见的事。追纸、歪杯子、没有报告的夜晚……居然快写满了。','You wanted to record what happened along the way. The flying page, the crooked cup, the night without a report… We have nearly filled it.')}},
 p('背面写满了，还可以再添一页。','We can add another sheet.'),
 a('门后的记录可能采用别的符号和规则。我们先读懂，再决定怎么走。我不想给你一张假装什么都知道的地图。','Records beyond the gate may use other symbols and rules. We will read them before choosing a path. I do not want to hand you a map that pretends to know everything.','resolve'),
 p('眼下先完成这条输出定理。门开不开，也交给真正的证明。','For now, we finish exportation. A real proof will decide whether this gate opens.'),
 a('还有一件事，不属于任务。到了能停下来的地方，我想和你再看一次星星。','There is something else, outside the assignment. When we find a place to stop, I want to look at the stars with you again.','smile'),
 choice(p('我记下了。','I will remember.'),'next-journey',[
 option('stars','下一次，不带观测表。','Next time, no observation forms.','但要带毯子。两条……或者一条足够大的。','But we should bring blankets. Two… or one large enough.'),
 option('home','也给归来的路留一盏灯。','Let us leave a light for the journey home.','好。这样无论走到哪里，我们都有一个可以说“回去”的地方。','Yes. Then wherever we travel, we will have a place we can call home.')]),
 n('她在航图边缘添了一颗很小的星，紧挨着你的字。门尚未开启，你们已经约好下一次同行。','She adds a tiny star beside your handwriting. The gate is still closed, but you have already agreed to travel together again.'),
]),
];

const side=(id:string,chapter:number,title:ReturnType<typeof t>,location:ReturnType<typeof t>,lines:StoryLine[],condition:Partial<StoryScene['condition']>={},kind:StoryScene['kind']='companion'):StoryScene=>({id,chapter,title,location,lines,kind,artId:`stage2-${chapter}`,condition:{minChapter:chapter,seen:[`stage2-${chapter}`],...condition}});
scenes.push(
side('companion-first-harvest',5,t('不太整齐的一篮','An Uneven Basket'),t('农场小憩','A Farm Break'),[
 n('第一次收获留下的篮子被她洗干净，放在桌子中央。','She has washed the basket from your first harvest and set it in the middle of the table.'),
 a('最大的一株倒得最早，最不起眼的那株反倒长得好。我写的预测一半都错了。','The largest shoot fell first. The smallest did well. Half my predictions were wrong.','surprise'),
 p('下次可以照样试。今天先尝尝？','We can try again next time. Shall we taste today’s crop first?'),
 a('好。这个有点酸……等等，不要因为是我种的就说甜。','All right. This one is sour… Wait, do not call it sweet just because I grew it.','smile'),
 p('酸的。下次少摘早一点。','It is sour. Let us pick it later next time.'),
 n('她笑着把“再等一等”写在种植记录上，下面多画了两个碗。','Laughing, she writes “wait a little longer” in the growing log, then draws two bowls below it.'),
],{farm:'harvested'}),
side('companion-garden-seat',4,t('尚未开花也可以来','Before Anything Blooms'),t('园圃长椅','The Garden Bench'),[
 a('椅子找到了，就是一边矮了一点。你别动，我垫一张旧表。','I found the chairs. One leg is a little short. Stay still; I will fold a roster under it.','think'),
 p('这里还没长出什么。','Nothing has grown here yet.'),
 a('所以现在来的人，总不能说是为了收成。','Then anyone visiting now can hardly claim to be here for the harvest.','smile'),
 p('也可能是为了试椅子。','They might be testing the chairs.'),
 a('那请认真试一会儿。我去拿另一杯茶。','Then please give it a thorough test. I will fetch the other cup of tea.','smile'),
],{farm:'unlocked'}),
side('companion-harbor',2,t('不只有一条归路','More Than One Way Back'),t('新港口','The New Harbor'),[
 n('新码头旁多了一排尚未命名的挂钩。奥蕾莉娅拿着两块路牌，迟迟没有钉上。','A row of unnamed hooks lines the new dock. Aurelia holds two signs, hesitating to nail them up.'),
 a('以前我总想把所有航线挤进同一个港口，这样一眼就能看住。','I used to want every route through one harbor, so I could watch them all at once.','think'),
 p('现在可以让不同的证明走不同的岸。看不全的时候，我们查航图。','Now different proofs can use different shores. When we cannot see everything, we can check the chart.'),
 a('那这块写“出发”。另一块……写“回来也欢迎”。','Then this sign says “Departures.” The other… “Welcome back, too.”','smile'),
 n('你扶住路牌，她把钉子敲正。两块牌子朝着不同的方向，字迹却靠得很近。','You hold the signs while she straightens the nails. The boards face different ways; the handwriting sits close together.'),
],{minHarbors:2}),
side('companion-proof-reuse',3,t('航线上的署名','Names Along a Route'),t('航图桌','The Chart Table'),[
 n('一条已完成的证明调用了另一座岛的成果。航图上，来路终于有了可追溯的线。','A completed proof has used a result from another island. Its route can now be traced on the chart.'),
 a('这条线有来处。后来的人点开它，能看到我们从哪些前提出发。','This line has a source. Someone following it can see the premises we started with.','smile'),
 p('不能只写一个漂亮的结论。','A beautiful conclusion alone is not enough.'),
 a('嗯。不过页边还有一点地方。我想记：那天你替我按住了被风吹走的纸。','Yes. There is still room in the margin, though. I want to write that you held the paper down against the wind.'),
],{proofReuse:true}),
side('explore-first-light',1,t('路标的另一面','The Other Side of a Waymark'),t('航标旁','Beside a Waymark'),[
 n('你把一处航标记进手记。背面没有谜题，只有一道测风留下的旧刻痕。','You record a waymark. There is no riddle on its back, only an old mark left by someone measuring the wind.'),
 a('不是每个地方都要通关。有时知道它在那里，就能让地图变得可靠一点。','Not every place needs to be solved. Sometimes knowing it is there makes the map a little more dependable.','smile'),
 p('那这一页可以只记颜色和风向。','Then this page can simply record the colors and the wind.'),
 a('也记上天气好的时候，可以坐在哪边。这个我很擅长。','And which side is pleasant to sit on in fine weather. That is something I know well.','smile'),
],{minDiscoveries:1},'exploration'),
side('explore-three-regions',3,t('同一片天空的不同岸','Different Shores, One Sky'),t('旅行手记','Travel Notes'),[
 n('几处航标的拓印摊在桌上。纸上有不同的岩纹与叶影，没有哪一张替另一张作答。','Rubbings from several waymarks cover the table. Rock patterns and leaf shadows differ; none answers on behalf of another.'),
 a('风会磨平一种石头，也会把另一种石头刻得更深。以前我只记哪里能走，现在开始记哪里值得停。','Wind smooths one stone and cuts another more deeply. I used to record where we could go. Now I record where we might stay.','think'),
 p('换了岸线，证明的规则却不会自动换掉。','A different shore does not automatically change the rules of proof.'),
 a('对。以后若遇到新的符号，我们要读当地的记录。不能只凭石头的颜色猜它是什么意思。','Exactly. If we meet new symbols, we will read their records. The color of a stone cannot tell us what they mean.'),
 n('她把一张空白页夹在最后，没有提前写下远方的名字。','She places a blank sheet at the end, leaving the distant places unnamed.'),
],{minDiscoveries:3},'exploration'),
side('companion-after-fracture',9,t('把杯子递过来','Pass Me the Cup'),t('记录室门外','Outside the Archive'),[
 a('你今天看了我的光环三次。','You looked at my halo three times today.','think'),
 p('被发现了。我怕它又疼。','You noticed. I was worried it hurt again.'),
 a('会疼的时候，我会告诉你。现在能先把杯子递过来吗？我想正常地偷一会儿懒。','I will tell you when it hurts. Could you pass me the cup for now? I would like an ordinary moment of laziness.','smile'),
 p('可以。今天的茶没有推导步骤。','Of course. Today’s tea has no derivation attached.'),
 n('她双手捧着杯子，肩膀慢慢放松。裂痕还在，但这个下午不只剩下裂痕。','She holds the cup in both hands, her shoulders easing. The fracture remains, but it is not all this afternoon contains.'),
]),
side('epilogue-second-gate',10,t('下一页写我们','Our Next Page'),t('门开启之后','After the Gate Opens'),[
 n('最后一条连接通过检验，门上的星纹逐次亮起。这一次，不是愿望替你们宣布了成功。','The last connection passes verification. Stars light across the gate in sequence. This time, success is more than a wish.'),
 a('开了。我本来准备了一段很正式的话，现在一句也想不起来。','It opened. I had prepared something very formal to say. I cannot remember a word of it.','surprise'),
 p('那就不说正式的话。','Then leave the formal words behind.'),
 {...a('下一次看星星的约定，还算数吗？','Does our promise to see the stars again still stand?','smile'),echo:{choiceId:'next-journey',optionId:'home',text:t('我把归航灯留着了。不是要催你回来，是想和你一起有个归处。','I left the homeward light on. Not to hurry you back, but so we could have somewhere to return together.')}},
 p('算数。你想先走哪边？','It does. Which way would you like to go first?'),
 a('先去能看见天空的地方。这一次，是我想去。','Somewhere we can see the sky. This time, because I want to.','resolve'),
 n('她没有站到前面带路，而是在门槛旁等你并肩。手记翻到下一页，上面还没有路名。','She waits beside the threshold for you to join her. The journal opens to a fresh page, with no route named yet.'),
],{completedIslandIds:['i_0_-36']},'epilogue'),
);

// Scene IDs are save identities. Geography and mathematical branches are independent registries.
export const STORY_SCENES:Record<string,StoryScene>=Object.fromEntries(scenes.map(scene=>[scene.id,scene]));
export const STAGE2_STORIES:Record<string,StoryScene>=Object.fromEntries(scenes.filter(scene=>scene.kind==='main').map(scene=>[scene.id,scene]));
