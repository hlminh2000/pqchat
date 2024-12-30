import dayjs from "dayjs";

export const dummyMessages = [
  {
    avatar: "",
    id: crypto.randomUUID(),
    isUser: true,
    timestamp: dayjs().toISOString(),
    text: `
some code:
\`\`\`javascript
console.log("asdf")
console.log("asdf")
\`\`\`
    `
  },
  {
    avatar: "",
    id: crypto.randomUUID(),
    isUser: false,
    timestamp: dayjs().toISOString(),
    text: `
some code:
\`\`\`javascript
console.log("asdf")
console.log("asdf")
\`\`\`
    `
  },
]