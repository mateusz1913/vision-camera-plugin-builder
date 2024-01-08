export function expectFileContents(fileContent: string | Buffer, expectedContents: (string | RegExp)[]) {
  expectedContents.forEach((content) => {
    if (typeof content === 'object') {
      expect(fileContent).toMatch(content);
      return;
    }

    expect(fileContent).toStrictEqual(expect.stringContaining(content));
  });
}
