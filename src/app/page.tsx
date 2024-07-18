import ItemForm from "./items/form";

const Home = () => {
  return (
    <main className="flex min-h-screen flex-col items-center text-gray-700 font-mono w-full">
      <div className="text-5xl font-extrabold m-8">Solar Calculator</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full p-4">
        <div className="col-span-1 md:col-span-2">
          <ItemForm />
        </div>
        <div className="col-span-1">
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-blue-400 rounded-md">01</div>
            <div className="bg-blue-400 rounded-md">01</div>
            <div className="bg-blue-400 rounded-md">01</div>
            <div className="bg-blue-400 rounded-md">01</div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;
