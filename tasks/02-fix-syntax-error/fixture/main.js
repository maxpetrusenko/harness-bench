const buildGreeting = (name) => {
  const parts = ["Hello", name];
  return parts.join(", ") + "!";
;

const target = process.argv[2] ?? "world";
console.log(buildGreeting(target));
