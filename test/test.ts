class Chain<T = any> implements Promise<T> {
  private promise: Promise<any>;
  private config: any;

  constructor() {
    this.promise = new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.config);
      }, 3000);
    });
  }

  setConfig(data: any): this {
    this.config = { data };
    return this; // 返回当前实例
  }

  getData(): Promise<any> {
    return this.promise.then((result) => result.data);
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?:
      | ((value: any) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | null
      | undefined
  ): Promise<any> {
    return this.promise.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null | undefined): Promise<any> {
    return this.promise.finally(onfinally);
  }

  [Symbol.toStringTag]: "Promise";
}

const one = () => {
  return new Chain();
};

// 修改 two 函数以返回 Chain 实例
const two = async (): Promise<Chain<number>> => {
  const value = await new Promise<number>((resolve) => {
    setTimeout(() => {
      resolve(Date.now());
    }, 1000);
  });
  const pp = new Chain<number>();
  pp.setConfig(value);
  return pp; // 返回 Chain 实例
};

const main = async () => {
  // 使用方式 1
  const p = await one();
  console.log(p);

  // 使用方式 2
  const w = await one().setConfig({ data: "xxxxx" }).getData();
  console.log(w);

  // 使用方式 3
  const c = await two();
  console.log(c);

  // 使用方式 4
  const a = await two().then((chain) =>
    chain.setConfig({ data: "xxxxx" }).getData()
  );
  console.log(a);
};

// 执行主函数
main();
