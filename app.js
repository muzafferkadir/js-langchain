require('dotenv').config();
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { DirectoryLoader } = require("langchain/document_loaders/fs/directory");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { FaissStore } = require("langchain/vectorstores/faiss");
const { ChatOpenAI } = require("langchain/chat_models/openai");
const { BufferMemory } = require("langchain/memory");
const { ConversationalRetrievalQAChain } = require("langchain/chains");


const getPDFs = async () => {
  try {
    const directoryLoader = new DirectoryLoader("./documents",
      { ".pdf": (path) => new PDFLoader(path, { splitPages: false }) }
    );

    const docs = await directoryLoader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n"],
    });

    const splitDocs = await textSplitter.splitDocuments(docs);

    const embeddings = new OpenAIEmbeddings();
    const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);

    const llm = new ChatOpenAI();
    const memory = new BufferMemory({ memoryKey: "chat_history", returnMessages: true });

    const conversationChain = ConversationalRetrievalQAChain.fromLLM(llm, vectorStore.asRetriever(), { memory });
    console.log('Documents are loaded...');

    return conversationChain;
  } catch (error) {
    console.error(error);
  }
}










// get question from console
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const listenConsole = (conversation) => {
  rl.question('Question: ', (cmd) => {
    try {
      if (cmd.toLowerCase() === 'exit') {
        console.log('Exit...');
        rl.close();
      } else {
        conversation?.call({ question: cmd }).then((answer) => {
          console.log(`Answer: ${answer?.text}`);
          listenConsole(conversation);
        });
      }
    } catch (error) {
      console.error(error);
    }
  });
}

async function main() {
  console.log('Documents are loading...');
  const conversation = await getPDFs();
  listenConsole(conversation);
}

main();