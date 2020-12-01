//
//  HeaderView.swift
//  DaDaIkSeon
//
//  Created by 양어진 on 2020/11/25.
//

import SwiftUI

struct HeaderView: View {
    
    // MARK: ViewModel
    
    @ObservedObject var viewModel: AnyViewModel<MainState, MainInput>
    
    // MARK: Body
    
    var body: some View {
        HStack {
            Button(action: {
                print("내 정보 버튼 Did tap")
            }, label: {
                Image.person
                    .resizable()
                    .frame(width: 25, height: 25)
                    .foregroundColor(.black)
                    .padding(.leading, 4)
            })
            
            Spacer()
            
            Button(action: {
                viewModel.trigger(.showCheckBox)
            }, label: {
                Text("선택")
                    .padding(.trailing, 4)
                    .foregroundColor(.black)
            })
        }.padding([.leading, .trailing], 16)
    }
    
}

struct HeaderView_Previews: PreviewProvider {
    
    static var previews: some View {
        HeaderView(viewModel: AnyViewModel(MainViewModel(service: TokenService())))
    }
    
}
