//prints any errors instead of crashing
process.on('unhandledRejection',error=>{
	console.error(error)
})
//imports discord.js and fs, and initially reads all the necessary files
const Discord=require('discord.js')
const fs=require("fs")
const {Client,Intents}=require('discord.js')
const client=new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES", "DIRECT_MESSAGE_REACTIONS", "DIRECT_MESSAGE_TYPING"], partials: ['CHANNEL',] })
const { Collection }=require('discord.js')
let config=JSON.parse(fs.readFileSync("config.json","utf8"))
let data=JSON.parse(fs.readFileSync("data.json","utf8"))
let secret=JSON.parse(fs.readFileSync("secret.json","utf8"))

//functions for generating embeds
//returns a red embed saying error
const errorMessage=((desc)=>{
	return {embeds:[{
		title:"ERROR",
		color:"BF3D3D",
		description:desc,
	}]}
})
//returns a blue embed saying information
const infoMessage=((desc)=>{
	return {embeds:[{
		title:"INFORMATION",
		color:"0000b0",
		description:desc
	}]}
})
//returns a green embed saying "success" with a specified link
const successMessage=((desc,url)=>{
	return {embeds:[{
		title:"SUCCESS",
		color:"00b000",
		description:desc,
		url:url
	}]}
})
//prints a character's profile
const profileMessage=((character)=>{
	data=JSON.parse(fs.readFileSync("data.json","utf8"))
	//embed starts off with all mandatory information that any character has
	let embed={
		title:`__${character.name}__ (b. ${character.bornYear} AD)`,
		description:`Created by <@${character.author}>`,
		footer:{
			text:`id: ${character.id}`
		},
		color:"728DC1",
		fields:[
			{
				name: "Gender",
				value: character.gender,
				inline: true
			},
			{
				name: "Personality",
				value: character.person,
				inline: true
			},
		]
	}
	//legacy indicates that this character was restored
	if(!!character.legacy){
		embed.footer.text=embed.footer.text.concat(" | Legacy")
	}
	
	if(character.father!=undefined&&character.father!=""){
		//gets the character's father
		let fatherCharacter=data.find(e=>e.id==character.father)
		embed.fields.push(
			{
				name: "Father",
				value: `[${fatherCharacter.name}](${fatherCharacter.url})`, //[text]{link} format produces a hyperlink
				inline: true
			}
		)
	}
	if(!character.alive){
		//edits a character's title to indicate it's dead, and adds an obituary field
		embed.title=`__${character.name}__ (${character.bornYear} - ${character.deathYear} AD)`
		embed.fields.push(
			{
				name: "Obituary",
				value: `${character.obituary?character.obituary:"N/A"}`,
				inline: true
			},
			{
				name: "\u200b",
				value: "\u200b",
				inline: true
			},
			{
				name: "\u200b",
				value: "\u200b",
				inline: true
			}
		)
	}
	
	if(character.children.length>0){
		//adds a field with all of this character's children (according to Castlemore the posh word for children is 'issue') as a comma-seperated list
		embed.fields.push(
			{
				name: "Issue",
				value: character.children.map(e=>{
					const child=data.find(f=>f.id==e)
					return `[${child.name}](${child.url})`
				}).join(", "),
				inline: true
			},
			{
				name: "\u200b",
				value: "\u200b",
				inline: true
			},
			{
				name: "\u200b",
				value: "\u200b",
				inline: true
			}
		)
	}
	// adds a field with a character's stats if it's randomly generated, and states its fertility if it doesn't (fertility is secret for non-random characters)
	if(!character.preset){
		embed.fields.push(
			{
				name: "Diplomacy",
				value: `${character.dip}`,
				inline: true
			},
			{
				name: "Intelligence",
				value: `${character.intel}`,
				inline: true
			},
			{
				name: "Administration",
				value: `${character.admin}`,
				inline: true
			},
			{
				name: "Martial",
				value: `${character.mil}`,
				inline: true
			},
			{
				name: "\u200b",
				value: "\u200b",
				inline: true
			},
			{
				name: "Dice Bonus",
				value: character.dice,
				inline: true
			}
		)
	}
	else {
		embed.fields.push(
			{
				name: "Fertility",
				value: character.fertility.toString(),
				inline: true
			},
			{
				name: "Dice Bonus",
				value: character.dice,
				inline: true
			}
		)
	}
	
	if(character.img){
		//sets the embeds's thumbnail as the character's image
		embed.thumbnail={url: character.img}
	}
	
	if(character.approval>0){
		//adds to the description to indicate the character was approved
		embed.description=embed.description.concat(`, approved by <@${character.approval}>`)
	}
	
	if(character.desc){
		//adds a field for the character's description
		embed.fields.push({
			name: "Description",
			value: character.desc
		})
	}
	return {
		//adds a bit of text to the message to make searching for characters simpler (although technically redundant as embeds can be searched, it looks nice :D)
		"content":`\u200b\n${character.name} (id: ${character.id})`,
		"embeds": [embed]
	}
})

//returns character corresponding to requested ID if requested ID is valid
const sanitise=((idInput)=>{
	data=JSON.parse(fs.readFileSync("data.json","utf8"))
	return /^\d+$/.test(idInput)?data.find(e=>e.id==idInput):undefined // if the user's input are all numbers, then return the requested character (will return undefined if it cannot be found), else return undefined
})
//returns boolean reflecting whether a year is valid or not
const validYear=((year)=>{
	return !year.replace(/[0-9]/g,"").replace(/\s/g,"")
})

//list of personalities, tendancies and ways a child can die (credit to who_though and Castlemore for these lists)
const personalities = ['Bawdy Drunk','Generous Soul','Materialist Hoarder','Pious Sage','Cruel Wretch','Humble Loyalist','Efficient Pragmatist','Erudite Scholar','Prideful Egotist','Self-Serving Schemer','Decadent Spender','Ruthless Atheist','Devoted Warrior','Peaceful Appeaser','Thrill-Seeking Gambler','Radical Idealist','Fearless Warmonger','Naïve Idoliser','Human Calculator','Devoted Idealogue','Petty Villain','Charismatic Politician','Shrewd Administrator','Reclusive Thinker','Unhinged Psychopath','People-Pleaser','Pragmatic Investor','Arrogant Know-It-All','Bold Soldier','Bold Romantic','Cold Individualist','Introspective Philosopher','Blustering Fool','Reclusive Empath','Indignant Self-Server','Gullible Fool','Self-Important Bully','Kind Soul','Entitled Beggar','Depressed Whiner','Bigoted Oppressor','Bashful Coward','Privileged Snob','Persistent Debater','Brave Guardian','Vain Egotist','Judgemental Prude','Careful Strategist','Disciplined Follower','Compulsive Liar','Bore','Blissful Wonderer','Chivalrous Romantic','Smooth Operator','Kindly Paternalist','Compassionate Intellectual','Protective Loyalist','Tiresome Nagger','Lazy Slob','Obsessive Rationalist','Crusading Zealot','Underhanded Scoundrel','Frugalist','Mournful Dweller','Stiff-Lipped Stoic','Indulgent Partygoer','Control Freak','Compulsive Overthinker','Gung-Ho Brawler','Paranoid Worrier','Diligent Worker','Naïve Fantasist','Passionate Team Player','An Uncomfortable Presence','Obsessive Workaholic','Unfeeling Mathematician']
const tendencies = ['Bawdy','Generous','Materialist','Pious','Cruel','Humble','Efficient','Erudite','Prideful','Self-Serving','Decadent','Ruthless','Devoted','Peaceful','Thrill-Seeking','Radical','Fearless','Naïve','Calculating','Devoted','Petty','Charismatic','Shrewd','Reclusive','Unhinged','People-Pleaser','Pragmatic','Arrogant','Bold','Open','Cold','Introspective','Blustering','Reclusive','Indignant','Gullible','Self-Important','Kind','Entitled','Depressed','Bigoted','Bashful','Snobbish','Confrontational','Brave','Vain','Judgmental','Cautious','Disciplined','Dishonest','Boring','Blissful','Chivalrous','Suave','Kindly','Compassionate','Protective','Tiresome','Lazy','Individualist','Crusading','Underhanded','Uptight','Mournful','Stiff-Lipped','Indulgent','Controlling','Overthinking','Gung-Ho','Paranoid','Diligent','Fantasist','Passionate','Disconcerting','Obsessive','Unfeeling']
const deaths=['died from the flu', 'was stillborn', 'lived for only half a year', 'died from measles', 'died from a cold', 'died from a fever', 'died from chickenpox']

client.on('ready',()=>{
	//acknowledges that the bot has started
	console.log("Bot is ready")
})

client.on('messageCreate',(async(msg)=>{
	if(msg.author.bot) return // rejects messages from other bots
	if(msg.channel.type=="DM"){ // rejects DMs
		return msg.reply(errorMessage("This bot does not accept direct messages."))
	}
	if(!msg.content.startsWith(config.prefix)) return // rejects any message that doesn't start with the required prefix
	
	//splits command into the actual command (command) and the command's arguments (args)
	const req=msg.content.split(config.prefix)[1].split(" ")
	const command=req[0]
	let args=req.slice(1)
	
	//returns a list of all commands and a corresponding description
	if(command=="help"){
		return msg.reply({embeds:[
			{
				title:`COMMANDS`,
				color:"0000b0",
				fields: [
					{
						name: `${config.prefix}new male-name${config.seperator}female-name${config.seperator}father-id${config.seperator}year-of-birth`,
						value: `Generates a new character with an optional description. The bot randomly generates your character's gender, so you should choose a name for each potential gender. You should put the father's character ID into the father bracket.`
					},
					{
						name: `${config.prefix}photo character-id http://url_to_photo.com`,
						value: `Add or edit a photo to your existing character using a URL.`
					},
					{
						name: `${config.prefix}describe character-id description`,
						value: `Add or edit the description of your existing character.`
					},
					{
						name: `${config.prefix}death character-id obituary`,
						value: `Kills one of your existing characters with an optional obituary. Their death will be announced in <#${config.death}>`
					},
					{
						name: `${config.prefix}view character-id`,
						value: `Gets the profile of the requested character.`
					},
					{
						name: `${config.prefix}preset full-name${config.seperator}gender${config.seperator}year-of-birth${config.seperator}personality${config.seperator}fertility${config.seperator}dice-bonus${config.seperator}optional-father-id`,
						value: `This creates a historical character or the starting character of a new dynasty. They do not have stats.`
					},
					{
						name: `${config.prefix}approve character-id`,
						value: `This can be used by staff to approve historical characters. Note: this command can only be used by <@&${secret.modRole}>.`
					}
				]
			}
		]})
	}
	
	//creates a preset character
	if(command=="preset"){
		//reformat args to account for "/" and remove any whitespace
		args=args.join(" ").split(config.seperator).map(e=>e.trim())
		if(args.length<6){
			//reject if any args are missing
			return msg.reply(errorMessage(`Please specify the character's name, followed by your character's gender, year of birth, personality, fertility, dice bonus and an optional father ID. Each of these fields must be seperated by the \`${config.seperator}\` key. See \`${config.prefix}help\` for more details.`))
		}
		const name=args.shift()
		const gender=args.shift()
		const bornYear=args.shift()
		const person=args.shift()
		const fertility=args.shift()
		const dice=args.shift()
		const fatherId=args.shift()
		
		if(!(gender=="Male"||gender=="Female")){
			return msg.reply(errorMessage(`Invalid gender: Gender must be \`Male\` or \`Female\`.`))
		}
		
		if(!validYear(bornYear)){
			return msg.reply(errorMessage(`Invalid birth year: \`${bornYear}\` must be a number.`))
		}
		
		if(!/^\d+$/.test(fertility)||parseInt(fertility)<=0){
			return msg.reply(errorMessage(`Invalid fertility: \`${fertility}\` must be a positive or zero number.`))
		}
		
		//gets the character's father given a valid fatherId
		data=JSON.parse(fs.readFileSync("data.json","utf8"))
		let fatherCharacter=undefined //the fatherCharacter variable is defined beforehand as we perform comparisons on it later, irrespective of whether there's an actual fatherCharacter or not
		if(!!fatherId){
			let fatherIndex=data.findIndex(e=>e.id==fatherId)
			if(fatherIndex==-1){
				return msg.reply(errorMessage(`Father not found: \`${fatherId}\` does not correspond to any known character IDs.`))
			}
			let fatherCharacter=data[fatherIndex]
			if(fatherCharacter.gender=="Female"){
				return msg.reply(errorMessage(`Incorrect gender: Please specify a male character as the father to continue.`))
			}
			if(parseInt(msg.author.id)!=parseInt(fatherCharacter.author)){
				return msg.reply(errorMessage(`Insufficient permissions: only this character's father's author <@${fatherCharacter.author}> may run this command.`))
			}
		}
		//defines the character
		let character={
			"id":data.length+1,
			"name":name,
			"gender":gender,
			"bornYear":bornYear,
			"person":person,
			"desc":"",
			"author":msg.author.id,
			"alive":1,
			"img":0,
			"deathYear":0,
			"obituary":"",
			"children":[],
			"fertility":fertility,
			"father":fatherId||undefined,
			"preset":1,
			"approval":0,
			"dice":dice,
			"embed":0,
			"channel":"",
			"url":"",
			"children":[],
			"legacy":false
		}
		
		return client.channels.fetch(config.birth).then(async channel=>{
			await channel.send(profileMessage(character)).then((sent)=>{
				//updates the character once the initial profileMessage is sent
				character.embed=sent.id
				character.url=sent.url
				character.channel=sent.channel.id
			})
		}).then(async ()=>{
			//adds the character to the database and to the list of fatherCharacter's children, and updates the fatherCharacter
			data.push(character)
			if(fatherCharacter!=undefined){
				data[fatherIndex].children.push(character.id)
				fatherCharacter.children.push(character.id)
				data[fatherIndex]=fatherCharacter
				await client.channels.fetch(config.birth).then(channel=>{
					channel.messages.fetch(fatherCharacter.embed).then(message=>{
						message.edit(profileMessage(fatherCharacter))
					})
				})
			}
			fs.writeFileSync("data.json",JSON.stringify(data,null,2))
		}).then(()=>{
			return msg.reply(successMessage(`It's a ${character.gender=="Male"?"boy":"girl"}! \`${character.name}\` has been created successfully.`,character.url))
		}).catch((err)=>msg.reply(errorMessage(err)))
	}
	//approves preset characters
	if(command=="approve"){
		if(!msg.member.roles.cache.some(e=>e.id==secret.modRole)){
			return msg.reply(errorMessage(`Insufficient permissions: Only <@&${secret.modRole}> can approve preset characters.`))
		}
		
		if(args.length<1){
			return msg.reply(`Please input a list of character IDs that you want to approve, with each ID seperated by a space.`)
		}
		data=JSON.parse(fs.readFileSync("data.json","utf8"))
		//goes through the entire list of characters to approve
		return args.forEach(async(e)=>{
			let character=await sanitise(e)
			if(character==undefined){
				return msg.reply(errorMessage(`Character not found: \`${e}\` does not correspond to any known character IDs.`))
			}
			if(character.approval==-1){
				return msg.reply(errorMessage(`Character randomly generated: \`${e}\` is randomly generated and cannot be approved. Only preset characters require approval.`))
			}
			if(character.approval!=0){
				return msg.reply(errorMessage(`Character already approved: \`${e}\` has already been approved by <@${character.approval}>.`))
			}
			
			character.approval=msg.author.id
			data[data.findIndex(f=>f.id==e)]=character
			fs.writeFileSync("data.json",JSON.stringify(data,null,2))
			
			client.channels.fetch(character.channel).then(channel=>{
				channel.messages.fetch(character.embed).then(message=>{
					message.edit(profileMessage(character))
					msg.reply(successMessage(`Character \`${e}\` approved successfully.`,character.url))
				})
			})
		})
	}
	
	//generates a new, random character
	if(command=="new"){
		args=args.join(" ").split(config.seperator).map(e=>e.trim()).filter(e=>e!="")
		if(args.length<4){
			return msg.reply(errorMessage(`Please specify the character's full male and female names, followed by the character ID of the father and your character's year of birth. Each of these fields must be seperated by the \`${config.seperator}\` key. See \`${config.prefix}help\` for more details.`))
		}
		const maleName=args.shift()
		const femaleName=args.shift()
		const fatherId=args.shift()
		const bornYear=args.shift()
		
		if(!validYear(bornYear)){
			return msg.reply(errorMessage(`Invalid birth year: \`${bornYear}\` must be a valid year.`))
		}
		data=JSON.parse(fs.readFileSync("data.json","utf8"))
		const father=data.findIndex(e=>e.id==fatherId)
		if(father==-1){
			return msg.reply(errorMessage(`Father not found: \`${fatherId}\` does not correspond to any known character IDs.`))
		}
		const fatherCharacter=data[father]
		if(fatherCharacter.gender=="Female"){
			return msg.reply(errorMessage(`Incorrect gender: Please specify a male character as the father to continue.`))
		}
		if(parseInt(msg.author.id)!=parseInt(fatherCharacter.author)){
			return msg.reply(errorMessage(`Insufficient permissions: only this character's father's author <@${fatherCharacter.author}> may run this command.`))
		}
			
		let character={
			"id":data.length+1,
			"bornYear":bornYear,
			"name":"",
			"desc":"",
			"img":0,
			"gender":"",
			"dip":Math.floor(Math.random()*(config.range+1)),
			"mil":Math.floor(Math.random()*(config.range+1)),
			"admin":Math.floor(Math.random()*(config.range+1)),
			"intel":Math.floor(Math.random()*(config.range+1)),
			"person":`${tendencies[Math.floor(Math.random()*tendencies.length)]} ${personalities[Math.floor(Math.random()*personalities.length)]}`,
			"author":msg.author.id,
			"alive":1,
			"obituary":"",
			"deathYear":0,
			"father":fatherCharacter.id,
			"children":[],
			"fertility":Math.round(Math.random()*config.fertilityRange),
			"preset":0,
			"approval":-1,
			"embed":"",
			"channel":"",
			"url":"",
			"legacy":false
		}
		//generates random gender and sets its name, then reduces mil by 20% if female
		character.gender=Math.round(Math.random())?"Male":"Female"
		character.name=(character.gender=="Male"?maleName:femaleName)
		character.mil=(character.gender=="Female"?Math.round(character.mil*=0.8):character.mil)
		//defines character bonuses as set in config.json
		character.dice=config.dices.find(e=>Math.round(e.odds*config.range)<=character.mil&&Math.round(e.odds*config.range)<=character.intel).bonus
		
		//generates three random numbers to determine chances of conception, mother dying and child dying
		const conception=[Math.round(Math.random()*100)/100,Math.round(Math.random()*100)/100,Math.round(Math.random()*100)/100,Math.round(Math.random()*100)/100,Math.round(Math.random()*100)/100]
		if(conception[2]<config.conceptionOdds||fatherCharacter.children.length>fatherCharacter.fertility){ // if the character has too many children, throws the same errorMessage as if it failed to conceive
			return msg.reply(infoMessage(`Unfortunately, ${character.name}'s mother did not become pregnant.`))
		}
		if(conception[1]<config.motherOdds){
			msg.reply(infoMessage(`Unfortunately, ${character.name}'s mother died in childbirth. (Required ${config.motherOdds} to survive, got ${conception[1]})`))
		}
		//generates a random reason for the child dying, outputs an obituary in #config.death and updates the child's profile
		if(conception[0]<config.birthOdds){
			character.alive=0
			character.deathYear=character.bornYear
			const deathReason=deaths[Math.floor(Math.random()*deaths.length)]
			character.obituary=`Unfortunately, ${character.name} ${deathReason}. (Required greater than ${config.birthOdds} to survive, got ${conception[0]})`
			msg.reply(infoMessage(character.obituary))
			client.channels.fetch(config.death).then(channel=>{
				channel.send({embeds:[{
					title:`__${character.name}__ (${character.bornYear} - ${character.deathYear})`,
					description:`Created by ${msg.author}`,
					color:"728DC1",
					fields: [
						{
							name: "Obituary",
							value: character.obituary
						}
					],
				}]})
			})
		}
		
		return client.channels.fetch(config.birth).then(async channel=>{
			await channel.send(profileMessage(character)).then((sent)=>{
				character.embed=sent.id
				character.url=sent.url
				character.channel=sent.channel.id
			})
		}).then(()=>{
			data.push(character)
			fatherCharacter.children.push(character.id)
			data[father]=fatherCharacter
			fs.writeFileSync("data.json",JSON.stringify(data,null,2))
			if(character.alive){
				msg.reply(successMessage(`It's a ${character.gender=="Male"?"boy":"girl"}! \`${character.name}\` has been generated successfully.`,character.url))
			}
		}).then(()=>{
			client.channels.fetch(fatherCharacter.channel).then(channel=>{
				channel.messages.fetch(fatherCharacter.embed).then(message=>{
					message.edit(profileMessage(fatherCharacter))
				})
			})
		}).catch((err)=>msg.reply(errorMessage(err)))
	}
	//views a specific character given a list of space-seperated characterIds
	if(command=="view"){
		if(args.length<1){
			return msg.reply(errorMessage(`Please specify a list of IDs of the characters that you wish to view. Each ID must be seperated by a space. See \`${config.prefix}help\` for further instructions.`))
		}
		return args.forEach(async (e)=>{
			let character=await sanitise(e)
			if(character==undefined){
				return msg.reply(errorMessage(`Not found: \`${e}\` does not correspond to any known character IDs.`))
			}
			msg.reply(profileMessage(character))
		})
	}
	
	//outputs an obituary in #config.death and updates the character's profile
	if(command=="death"){
		if(args.length<2){
			return msg.reply(errorMessage(`Please specify the ID of the character you wish to die, followed by the year of death and an optional obituary. See \`${config.prefix}help\` for further instructions.`))
		}
		let id=args.shift().trim()
		let character=await sanitise(id)
		if(character==undefined){
			return msg.reply(errorMessage(`Not found: \`${id}\` does not correspond to any known character IDs.`))
		}
		
		let deathYear=args.shift().trim()
		if(!validYear(deathYear)){
			return msg.reply(errorMessage(`Invalid death year: \`${deathYear}\` must be a number.`))
		}
		data=JSON.parse(fs.readFileSync("data.json","utf8"))
		if(parseInt(msg.author.id)!=parseInt(character.author)){
			return msg.reply(errorMessage(`Insufficient permissions: only this character's author <@${character.author}> may run this command.`))
		}
		//intended behaviour to not to check if the character is already dead, to make updating mistaken obituaries or years of death easier
		character.obituary=args.join(" ")
		character.alive=0
		character.deathYear=deathYear
		data[data.findIndex(e=>e.id==id)]=character
		fs.writeFileSync("data.json",JSON.stringify(data,null,2))
		
		return client.channels.fetch(character.channel).then((channel)=>{
			channel.messages.fetch(character.embed).then(message=>{
				return message.edit(profileMessage(character))
			})
		}).then(()=>{
			client.channels.fetch(config.death).then((channel)=>{
				channel.send({embeds:[{
					title:`__${character.name}__ (${character.bornYear} - ${character.deathYear} AD)`,
					url:character.url,
					description:`Created by ${msg.author}`,
					color:"728DC1",
					fields: [
						{
							name: "Obituary",
							value: `${character.obituary?character.obituary:"N/A"}`
						}
					],
				}]})
			})
		}).then(()=>{
			msg.reply(successMessage(`\`${character.name}\` has died successfully.`,character.url))
		}).catch(err=>msg.reply(errorMessage(err)))
	}
	
	//edits a character's description
	if(command=="describe"){
		if(args.length<2){
			return msg.reply(errorMessage(`Please specify the ID of the character you wish to describe, followed by the new description. See \`${config.prefix}help\` for further instructions.`))
		}
		let id=args.shift()
		let character=await sanitise(id)
		if(sanitise(id)==undefined){
			return msg.reply(errorMessage(`Character not found: \`${id}\` does not correspond to any known character IDs.`))
		}
		if(parseInt(msg.author.id)!=parseInt(character.author)){
			return msg.reply(errorMessage(`Insufficient permissions: only this character's author <@${character.author}> may run this command.`))
		}
		
		character.desc=args.join(" ")
		
		data=JSON.parse(fs.readFileSync("data.json","utf8"))
		data[data.findIndex(e=>e.id==id)]=character
		fs.writeFileSync("data.json",JSON.stringify(data,null,2))
		return client.channels.fetch(character.channel).then(channel=>{
			channel.messages.fetch(character.embed).then(message=>{
				message.edit(profileMessage(character))
				msg.reply(successMessage(`\`${character.name}\`'s description has updated successfully.`,character.url))
			})
		})
	}
	
	//adds a photo to a character
	if(command=="photo"){
		if(args.length<2){
			return msg.reply(errorMessage(`Please specify the ID of the character you wish to add a photo for, followed by a URL to the photo. See \`${config.prefix}help\` for further instructions.`))
		}
		let id=args.shift().trim()
		let character=await sanitise(id)
		if(sanitise(id)==undefined){
			return msg.reply(errorMessage(`\`${id}\` does not correspond to any known character IDs.`))
		}
		if(parseInt(msg.author.id)!=parseInt(character.author)){
			return msg.reply(errorMessage(`Insufficient permissions: only this character's author <@${character.author}> may run this command.`))
		}
		
		character.img=args.join("").trim()
		//if it is not a valid url, then discord.js api crashes in an odd uncatchable way. therefore, here it checks if the requested images is a valid url. the url doesn't have to be to an image as that doesn't cause a crash, discord.js simply won't render an image
		if(!(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g).test(character.img)){
			return msg.reply(errorMessage(`Invalid URL: \`${character.img}\` must be a valid URL to your requested image.`))
		}
		data=JSON.parse(fs.readFileSync("data.json","utf8"))
		data[data.findIndex(e=>e.id==id)]=character
		fs.writeFileSync("data.json",JSON.stringify(data,null,2))
		return client.channels.fetch(character.channel).then(channel=>{
			channel.messages.fetch(character.embed).then((message)=>{
				message.edit(profileMessage(character)).then(()=>{
					msg.reply(successMessage(`\`${character.name}\`'s photograph has updated successfully.`,character.url))
				})
			})
		}).catch((err)=>msg.reply(errorMessage(err)))
	}

	//executes any code (obviously extremely dangerous command)
	if(command=="eval"){
		if(!secret.admins.includes(msg.author.id)){
			return msg.reply(errorMessage(`Insufficient permissions: You do not have the required permissions to execute this command.`))
		}
		
		//creates some sort of catching environment although it does not catch everything
		try{
			return msg.reply(eval(args.join(""))).catch(err=>msg.reply(`${err}`))
		}catch(err){
			return msg.reply(`${err}`)
		}
	}
	
	return msg.reply(errorMessage(`Command \`${command+" "+args.join(" ")}\` not recognised. Please try again, or use \`${config.prefix}help\` to obtain a list of commands`))
}))

client.login(secret.token)