as a user i want to be able to explore ideas, like crazy ideas, explroe the llms capabitlites, for this i need a tool that will let me do this...


at fit the current limiitations of simple chatsbots like chatgpt.com or grok.com or claude.com they are sinle chatbots, there are not agentic by default, 
and are not optmized for idea creations...

1. we clone the clasic chatbot fucionality,

2. we add a agent on the rigth side that can comands the session 
this agent can send user request to the ai models, this agent act as a user , and i interect with the agent as the orquestrator

use the docs/agent.js code as reference in how our agent should act

user_to_agent: give me 3 jokes
agent: pick the like 2 models who are the best for jokes ,
here we have a very large list of models we can use 

the agent pick the best 2 , and start the conversations with 2 models
user: tell me a joke
model1: joke1....

user: tell me a joke
model2; joke2...


for example here the joke 2  is great, we focus on chating with the models like a simple chatbot and we forget of using the agent, 


we use the agent when we are expereminig with which models or answers are great then we can focus on the mdoels give us the manin naswer and contnue chating with him


lets use vite and vanilla js to keep it simple



we use openrounter for the in
----


to see what is happening we add a simple minimap to know in which part of the branch we are, so we can retomate at any point of the conversatio when need


---

this is a mvp,


lets make it simple like in the config panel we can select or write the models we want ot use , then the agent have context of this models and can use it whatever it wants 

---

user:
create 3 jokes

agent: create 3 conversations
make 3 requests 


│ User: Generate  │  │ User: Generate  │  │ User: Generate  │
│ a funny joke    │  │ a funny joke    │  │ a funny joke    │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         ↓                     ↓                     ↓
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 🤖 Claude Haiku │  │ 🤖 Gemini Pro   │  │ 🤖 Claude Sonnet│
│ Why did the...  │  │ What do you...  │  │ Why don't...    │

--

remember we have a list of active models that the user has configured like for example the user has activaed 2 models,


then the user ask for 3 jokes, 

then the agent decides how to fullfil this, 

as we want to explore models a simple solutions woul be like 

agent: create 3 conversations
make 3 requests 


│ User: Generate  │  │ User: Generate  │  │ User: Generate  │
│ a funny joke    │  │ a funny joke    │  │ a funny joke    │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         ↓                     ↓                     ↓
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 🤖 Claude Haiku │  │ 🤖 Gemini Pro   │  │ 🤖 Claude Haiku
│ Why did the...  │  │ What do you...  │  │ Why don't...    │


-----
now the agent can not only create conversatin, can also continue conversations he can act as a user that ask questions to the ai models

user: i like the joke of haiku1, ask for 2 more  similar  jokes
agent: generate user questions:


│ User: genaereted question1  │  │ User: Generate  qiestion2│  
        └────────┬────────┘ 
         ↓                  ↓ 
┌─────────────────┐        
haiku1 :                     haiku2

User: make a joke       User: make a joke 


the idea is tha the agent can also continue the conversation with the ai models, as i comands them it can create branches like on this example it create 2 branches ,

think on a brnach to creat the branches in the most simplest way, its not destrucitive and we can always roolback to preivus messages


---

rememebr the main task of this is howe we manage the coversations history, we have 2 groupd of converstions history messages , we have this 2 types 

'user' | 'assistant'



1. with the agent here the 'assistant' will be te agent, in the agent chat

2. the actual x numbers of treatds where the 'user' message can be writed by the  the agent 


---

good now tell to each model to create a joke about doctors

---

now also add the agent model section where we pick wich models will be the agent 


--

also save each conversations history on the localstorage like this

session1: 
agent conversation : {...}
conversation chat1: {...}
conversation chat2: {...}


session2: 
////

also ways to clean it, and a new way to create , i mean lets manage the sessions , lets put it on the left like a claiss history of sessions


---

lets now think in how to add the branch feature, the idea is to have duplciated bracned but in the ui we show like children, this ways the user dont get overheml 


---

now lets improve the ui, like hide and show session is not working well , the converstions get cut on the left, i cannot read it well 


---


lets improve the ux/ui, like the input messge section, make it standsr like chatgpt.com or claude.com, i mean very smothh and polised, lets plan for a good ui, ux,
give me good reference of ui/ux, so i can tell to prgramer to implement it
lets try to copy and improve some good ui/ux